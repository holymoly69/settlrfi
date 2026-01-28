// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CustomComboFactory
 * @notice Factory contract for creating and managing user-created parlays (custom combos)
 * @dev Designed for HyperEVM deployment with HIP-3 permissionless perpetuals integration
 * 
 * Custom Combos allow users to bet on multiple market outcomes simultaneously.
 * All legs must resolve correctly for the combo to pay out (all-or-nothing).
 * Payout is $1 if all selected sides win, $0 otherwise.
 * 
 * Calculation Logic:
 * - Implied Probability = Product of individual leg probabilities (for selected side)
 * - Payout Multiplier = 1 / Implied Probability
 * - If leg price = 0.65 (65% YES), selecting YES → use 0.65, NO → use 0.35
 */
contract CustomComboFactory is Ownable2Step, ReentrancyGuard {
    
    // ============ Structs ============
    
    struct ComboLeg {
        uint256 marketId;      // ID of the underlying market
        bool isYes;            // true = YES side, false = NO side
        uint256 probability;   // Probability at time of creation (0-10000 = 0-100.00%)
    }
    
    struct CustomCombo {
        uint256 id;
        address creator;
        ComboLeg[] legs;
        uint256 impliedProbability;  // Combined probability (0-10000 = 0-100.00%)
        uint256 multiplier;          // Payout multiplier (scaled by 100, e.g., 455 = 4.55x)
        uint256 hyperPerpId;         // HIP-3 perpetual market ID (0 if not deployed)
        uint256 totalVolume;
        bool resolved;
        bool outcome;                // true = all legs won, false = at least one lost
        uint256 createdAt;
    }
    
    // ============ State Variables ============
    
    CustomCombo[] public customCombos;
    
    uint256 public minLegs = 2;
    uint256 public maxLegs = 10;
    uint256 public creationFee = 0;  // Fee in wei to create a combo (can be set by owner)
    
    mapping(address => uint256[]) public userCombos;  // Track combos by creator
    mapping(uint256 => uint256) public perpToCombo;   // Map HIP-3 perp ID to combo ID
    
    // ============ Events ============
    
    event CustomComboCreated(
        uint256 indexed comboId,
        address indexed creator,
        uint256[] marketIds,
        bool[] isYesSides,
        uint256 impliedProbability,
        uint256 multiplier
    );
    
    event CustomComboResolved(
        uint256 indexed comboId,
        bool outcome,
        uint256 timestamp
    );
    
    event HyperPerpDeployed(
        uint256 indexed comboId,
        uint256 hyperPerpId
    );
    
    event FeesUpdated(uint256 newCreationFee);
    event LimitsUpdated(uint256 minLegs, uint256 maxLegs);
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ External Functions ============
    
    /**
     * @notice Create a new custom combo (user-created parlay)
     * @param _marketIds Array of market IDs to include in the combo
     * @param _isYesSides Array of booleans indicating YES (true) or NO (false) for each leg
     * @param _probabilities Array of current probabilities for each leg (0-10000)
     */
    function createCustomCombo(
        uint256[] calldata _marketIds,
        bool[] calldata _isYesSides,
        uint256[] calldata _probabilities
    ) external payable nonReentrant returns (uint256 comboId) {
        require(_marketIds.length >= minLegs, "Too few legs");
        require(_marketIds.length <= maxLegs, "Too many legs");
        require(_marketIds.length == _isYesSides.length, "Arrays length mismatch");
        require(_marketIds.length == _probabilities.length, "Arrays length mismatch");
        require(msg.value >= creationFee, "Insufficient fee");
        
        // Calculate implied probability (product of leg probabilities)
        uint256 impliedProb = 10000;  // Start at 100% (10000 basis points)
        
        for (uint256 i = 0; i < _probabilities.length; i++) {
            require(_probabilities[i] > 0 && _probabilities[i] <= 10000, "Invalid probability");
            
            // Get the probability for the selected side
            uint256 legProb = _isYesSides[i] ? _probabilities[i] : (10000 - _probabilities[i]);
            
            // Multiply and scale down (maintain precision)
            impliedProb = (impliedProb * legProb) / 10000;
        }
        
        require(impliedProb > 0, "Probability too low");
        
        // Calculate multiplier: 10000 / impliedProb (scaled by 100)
        uint256 multiplier = (10000 * 100) / impliedProb;
        if (multiplier > 99900) multiplier = 99900;  // Cap at 999x
        
        // Create combo ID
        comboId = customCombos.length;
        
        // Create legs array
        ComboLeg[] memory legs = new ComboLeg[](_marketIds.length);
        for (uint256 i = 0; i < _marketIds.length; i++) {
            legs[i] = ComboLeg({
                marketId: _marketIds[i],
                isYes: _isYesSides[i],
                probability: _probabilities[i]
            });
        }
        
        // Store the combo
        customCombos.push();
        CustomCombo storage combo = customCombos[comboId];
        combo.id = comboId;
        combo.creator = msg.sender;
        combo.impliedProbability = impliedProb;
        combo.multiplier = multiplier;
        combo.hyperPerpId = 0;
        combo.totalVolume = 0;
        combo.resolved = false;
        combo.outcome = false;
        combo.createdAt = block.timestamp;
        
        // Copy legs
        for (uint256 i = 0; i < legs.length; i++) {
            combo.legs.push(legs[i]);
        }
        
        // Track user's combos
        userCombos[msg.sender].push(comboId);
        
        emit CustomComboCreated(
            comboId,
            msg.sender,
            _marketIds,
            _isYesSides,
            impliedProb,
            multiplier
        );
        
        return comboId;
    }
    
    /**
     * @notice Resolve a custom combo after all legs have settled
     * @param _comboId The combo ID to resolve
     * @param _legOutcomes Array of outcomes for each leg (true = YES won, false = NO won)
     */
    function resolveCustomCombo(
        uint256 _comboId,
        bool[] calldata _legOutcomes
    ) external onlyOwner {
        require(_comboId < customCombos.length, "Invalid combo ID");
        CustomCombo storage combo = customCombos[_comboId];
        require(!combo.resolved, "Already resolved");
        require(_legOutcomes.length == combo.legs.length, "Outcomes mismatch");
        
        // Check if all legs won
        bool allWin = true;
        for (uint256 i = 0; i < combo.legs.length; i++) {
            bool legWon = combo.legs[i].isYes == _legOutcomes[i];
            if (!legWon) {
                allWin = false;
                break;
            }
        }
        
        combo.resolved = true;
        combo.outcome = allWin;
        
        // If HIP-3 perp was deployed, settle it
        if (combo.hyperPerpId != 0) {
            _settleHyperPerp(combo.hyperPerpId, allWin);
        }
        
        emit CustomComboResolved(_comboId, allWin, block.timestamp);
    }
    
    /**
     * @notice Deploy a HIP-3 perpetual market for a combo (for trading)
     * @param _comboId The combo ID to deploy a perp for
     */
    function deployHyperPerp(uint256 _comboId) external onlyOwner returns (uint256 perpId) {
        require(_comboId < customCombos.length, "Invalid combo ID");
        CustomCombo storage combo = customCombos[_comboId];
        require(combo.hyperPerpId == 0, "Perp already deployed");
        require(!combo.resolved, "Combo already resolved");
        
        // Deploy HIP-3 event perpetual via Hyperliquid precompiles
        // This is a placeholder - actual implementation depends on HyperEVM SDK
        perpId = _deployHip3EventMarket(combo.impliedProbability);
        
        combo.hyperPerpId = perpId;
        perpToCombo[perpId] = _comboId;
        
        emit HyperPerpDeployed(_comboId, perpId);
        return perpId;
    }
    
    // ============ View Functions ============
    
    function getCombo(uint256 _comboId) external view returns (
        uint256 id,
        address creator,
        uint256 impliedProbability,
        uint256 multiplier,
        uint256 hyperPerpId,
        uint256 totalVolume,
        bool resolved,
        bool outcome,
        uint256 createdAt,
        uint256 legsCount
    ) {
        require(_comboId < customCombos.length, "Invalid combo ID");
        CustomCombo storage combo = customCombos[_comboId];
        return (
            combo.id,
            combo.creator,
            combo.impliedProbability,
            combo.multiplier,
            combo.hyperPerpId,
            combo.totalVolume,
            combo.resolved,
            combo.outcome,
            combo.createdAt,
            combo.legs.length
        );
    }
    
    function getComboLegs(uint256 _comboId) external view returns (ComboLeg[] memory) {
        require(_comboId < customCombos.length, "Invalid combo ID");
        return customCombos[_comboId].legs;
    }
    
    function getUserCombos(address _user) external view returns (uint256[] memory) {
        return userCombos[_user];
    }
    
    function getTotalCombos() external view returns (uint256) {
        return customCombos.length;
    }
    
    // ============ Admin Functions ============
    
    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
        emit FeesUpdated(_fee);
    }
    
    function setLegLimits(uint256 _min, uint256 _max) external onlyOwner {
        require(_min >= 2 && _max <= 15 && _min <= _max, "Invalid limits");
        minLegs = _min;
        maxLegs = _max;
        emit LimitsUpdated(_min, _max);
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Deploy a HIP-3 event perpetual market
     * Placeholder - actual implementation requires Hyperliquid SDK/precompiles
     */
    function _deployHip3EventMarket(uint256 /*initialPrice*/) internal pure returns (uint256) {
        // TODO: Implement with Hyperliquid HIP-3 SDK
        // This would call the Hyperliquid precompile to create a new event perp
        // The initial price would be set to the implied probability
        return 0;
    }
    
    /**
     * @dev Settle a HIP-3 perpetual market
     * Placeholder - actual implementation requires Hyperliquid SDK/precompiles
     */
    function _settleHyperPerp(uint256 /*perpId*/, bool /*outcome*/) internal pure {
        // TODO: Implement with Hyperliquid HIP-3 SDK
        // This would settle the perp at $1 (if outcome=true) or $0 (if outcome=false)
    }
    
    // ============ Fallback ============
    
    receive() external payable {}
}
