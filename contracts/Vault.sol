// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SettlrVault
 * @notice Vault contract for depositing/withdrawing HYPE tokens on HyperEVM
 * @dev Manages user deposits for the Settlr prediction markets platform
 */
contract SettlrVault is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // HYPE token address on HyperEVM
    IERC20 public immutable hypeToken;
    
    // Treasury address for protocol fees
    address public treasury;
    
    // User balances (shares, 1:1 with HYPE for now)
    mapping(address => uint256) public balances;
    
    // Minimum deposit amount (to prevent dust attacks)
    uint256 public minDeposit = 1e18; // 1 HYPE
    
    // Maximum deposit per transaction
    uint256 public maxDeposit = 1000000e18; // 1M HYPE
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed user, uint256 amount, uint256 newBalance);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event MinDepositUpdated(uint256 oldMin, uint256 newMin);
    event MaxDepositUpdated(uint256 oldMax, uint256 newMax);
    
    /**
     * @notice Constructor
     * @param _hypeToken Address of the HYPE token contract
     * @param _treasury Address for protocol treasury
     */
    constructor(address _hypeToken, address _treasury) Ownable(msg.sender) {
        require(_hypeToken != address(0), "Invalid HYPE token address");
        require(_treasury != address(0), "Invalid treasury address");
        
        hypeToken = IERC20(_hypeToken);
        treasury = _treasury;
    }
    
    /**
     * @notice Deposit HYPE tokens into the vault
     * @param amount Amount of HYPE to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount >= minDeposit, "Amount below minimum deposit");
        require(amount <= maxDeposit, "Amount exceeds maximum deposit");
        
        // Transfer HYPE from user to vault
        hypeToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Update balance (1:1 shares for now)
        balances[msg.sender] += amount;
        
        emit Deposited(msg.sender, amount, balances[msg.sender]);
    }
    
    /**
     * @notice Withdraw HYPE tokens from the vault
     * @param amount Amount of HYPE to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Update balance first (checks-effects-interactions pattern)
        balances[msg.sender] -= amount;
        
        // Transfer HYPE from vault to user
        hypeToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount, balances[msg.sender]);
    }
    
    /**
     * @notice Get user's balance in the vault
     * @param user Address of the user
     * @return User's balance
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @notice Get total HYPE held in the vault
     * @return Total vault balance
     */
    function getTotalDeposits() external view returns (uint256) {
        return hypeToken.balanceOf(address(this));
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
    
    /**
     * @notice Update minimum deposit amount
     * @param _minDeposit New minimum deposit
     */
    function setMinDeposit(uint256 _minDeposit) external onlyOwner {
        emit MinDepositUpdated(minDeposit, _minDeposit);
        minDeposit = _minDeposit;
    }
    
    /**
     * @notice Update maximum deposit amount
     * @param _maxDeposit New maximum deposit
     */
    function setMaxDeposit(uint256 _maxDeposit) external onlyOwner {
        emit MaxDepositUpdated(maxDeposit, _maxDeposit);
        maxDeposit = _maxDeposit;
    }
    
    /**
     * @notice Pause the vault (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the vault
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdrawal of stuck tokens (not HYPE)
     * @param token Token to recover
     * @param amount Amount to recover
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(hypeToken), "Cannot withdraw HYPE");
        IERC20(token).safeTransfer(treasury, amount);
    }
}
