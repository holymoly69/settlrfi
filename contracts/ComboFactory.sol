// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IMarket {
    function getOutcome() external view returns (bool resolved, bool outcome);
    function getCurrentProbability() external view returns (uint256);
}

contract ComboFactory is Ownable, ReentrancyGuard {
    struct ComboLeg {
        address marketAddress;
        bool side; // true = YES, false = NO
    }

    struct Combo {
        uint256 id;
        string name;
        ComboLeg[] legs;
        uint256 multiplier; // In basis points (e.g., 455 = 4.55x)
        uint256 expiry;
        bool active;
        uint256 totalVolume;
        uint256 openInterest;
    }

    struct Position {
        uint256 comboId;
        address holder;
        bool side; // true = YES (all legs hit), false = NO (at least one fails)
        uint256 size;
        uint256 leverage;
        uint256 entryMultiplier;
        bool closed;
    }

    uint256 public comboCount;
    uint256 public positionCount;
    
    mapping(uint256 => Combo) public combos;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;

    event ComboCreated(uint256 indexed comboId, string name, uint256 legCount, uint256 multiplier);
    event PositionOpened(uint256 indexed positionId, uint256 indexed comboId, address indexed holder, bool side, uint256 size);
    event PositionClosed(uint256 indexed positionId, int256 pnl);
    event ComboResolved(uint256 indexed comboId, bool outcome);

    constructor() Ownable(msg.sender) {}

    function createCombo(
        string calldata name,
        address[] calldata marketAddresses,
        bool[] calldata sides,
        uint256 multiplier,
        uint256 expiry
    ) external onlyOwner returns (uint256) {
        require(marketAddresses.length == sides.length, "Length mismatch");
        require(marketAddresses.length >= 2, "Minimum 2 legs required");
        require(marketAddresses.length <= 10, "Maximum 10 legs allowed");
        require(expiry > block.timestamp, "Expiry must be in future");

        comboCount++;
        Combo storage combo = combos[comboCount];
        combo.id = comboCount;
        combo.name = name;
        combo.multiplier = multiplier;
        combo.expiry = expiry;
        combo.active = true;

        for (uint256 i = 0; i < marketAddresses.length; i++) {
            combo.legs.push(ComboLeg({
                marketAddress: marketAddresses[i],
                side: sides[i]
            }));
        }

        emit ComboCreated(comboCount, name, marketAddresses.length, multiplier);
        return comboCount;
    }

    function openPosition(
        uint256 comboId,
        bool side,
        uint256 leverage
    ) external payable nonReentrant returns (uint256) {
        Combo storage combo = combos[comboId];
        require(combo.active, "Combo not active");
        require(block.timestamp < combo.expiry, "Combo expired");
        require(msg.value > 0, "Must send collateral");
        require(leverage >= 1 && leverage <= 50, "Invalid leverage");

        positionCount++;
        positions[positionCount] = Position({
            comboId: comboId,
            holder: msg.sender,
            side: side,
            size: msg.value * leverage,
            leverage: leverage,
            entryMultiplier: combo.multiplier,
            closed: false
        });

        userPositions[msg.sender].push(positionCount);
        combo.openInterest += msg.value * leverage;
        combo.totalVolume += msg.value * leverage;

        emit PositionOpened(positionCount, comboId, msg.sender, side, msg.value * leverage);
        return positionCount;
    }

    function closePosition(uint256 positionId) external nonReentrant {
        Position storage position = positions[positionId];
        require(position.holder == msg.sender, "Not position holder");
        require(!position.closed, "Position already closed");

        Combo storage combo = combos[position.comboId];
        
        (bool allResolved, bool comboOutcome) = _getComboOutcome(combo);
        require(allResolved, "Not all markets resolved");

        position.closed = true;
        combo.openInterest -= position.size;

        int256 pnl = _calculatePnl(position, comboOutcome);
        
        if (pnl > 0) {
            uint256 payout = uint256(pnl) + (position.size / position.leverage);
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "Transfer failed");
        }

        emit PositionClosed(positionId, pnl);
    }

    function _getComboOutcome(Combo storage combo) internal view returns (bool allResolved, bool outcome) {
        allResolved = true;
        outcome = true;

        for (uint256 i = 0; i < combo.legs.length; i++) {
            (bool resolved, bool legOutcome) = IMarket(combo.legs[i].marketAddress).getOutcome();
            
            if (!resolved) {
                allResolved = false;
                return (false, false);
            }

            bool legSuccess = (combo.legs[i].side == legOutcome);
            if (!legSuccess) {
                outcome = false;
            }
        }
    }

    function _calculatePnl(Position storage position, bool comboOutcome) internal view returns (int256) {
        uint256 margin = position.size / position.leverage;
        
        if (position.side == comboOutcome) {
            uint256 profit = (margin * position.entryMultiplier) / 100;
            return int256(profit);
        } else {
            return -int256(margin);
        }
    }

    function getComboLegs(uint256 comboId) external view returns (ComboLeg[] memory) {
        return combos[comboId].legs;
    }

    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    function getCurrentMultiplier(uint256 comboId) external view returns (uint256) {
        Combo storage combo = combos[comboId];
        uint256 combinedProb = 10000; // 100% in basis points

        for (uint256 i = 0; i < combo.legs.length; i++) {
            uint256 prob = IMarket(combo.legs[i].marketAddress).getCurrentProbability();
            if (!combo.legs[i].side) {
                prob = 10000 - prob;
            }
            combinedProb = (combinedProb * prob) / 10000;
        }

        if (combinedProb == 0) return 0;
        return (10000 * 10000) / combinedProb; // Multiplier in basis points
    }

    function deactivateCombo(uint256 comboId) external onlyOwner {
        combos[comboId].active = false;
    }

    receive() external payable {}
}
