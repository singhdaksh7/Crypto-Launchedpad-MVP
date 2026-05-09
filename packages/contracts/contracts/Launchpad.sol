// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Launchpad is Ownable, ReentrancyGuard {
    struct PresaleConfig {
        address tokenAddress;
        address owner;
        uint256 tokenPrice;
        uint256 softcap;
        uint256 hardcap;
        uint256 startTime;
        uint256 endTime;
        uint256 maxBuyPerUser;
        uint256 totalRaised;
        bool isActive;
        bool isFinalized;
    }

    struct UserContribution {
        uint256 amount;
        uint256 tokenAmount;
        bool claimed;
    }

    mapping(uint256 => PresaleConfig) public presales;
    mapping(uint256 => mapping(address => UserContribution)) public contributions;
    mapping(uint256 => address[]) public presaleContributors;

    /// Cumulative token amount the presale owner has deposited into this contract
    /// for a given presaleId. Used to enforce that buys can never exceed the funded
    /// supply, so claims can never fail on a properly behaved presale.
    mapping(uint256 => uint256) public presaleTokensFunded;

    uint256 public presaleCounter;
    uint256 public platformFee; // in basis points (e.g., 250 = 2.5%)
    address public feeRecipient;

    event PresaleCreated(
        uint256 indexed presaleId,
        address indexed tokenAddress,
        address indexed owner,
        uint256 softcap,
        uint256 hardcap,
        uint256 startTime,
        uint256 endTime
    );

    event TokensPurchased(
        uint256 indexed presaleId,
        address indexed buyer,
        uint256 amount,
        uint256 tokenAmount
    );

    event PresaleFinalized(uint256 indexed presaleId, bool success);
    event TokensClaimed(uint256 indexed presaleId, address indexed buyer, uint256 amount);
    event FundsWithdrawn(uint256 indexed presaleId, uint256 amount);
    event PresaleFunded(uint256 indexed presaleId, address indexed funder, uint256 amount);
    event RefundClaimed(uint256 indexed presaleId, address indexed buyer, uint256 amount);
    event OwnerTokensRecovered(uint256 indexed presaleId, address indexed owner, uint256 amount);

    constructor() Ownable() {
        platformFee = 250; // 2.5%
        feeRecipient = msg.sender;
    }

    function createPresale(
        address tokenAddress,
        uint256 tokenPrice,
        uint256 softcap,
        uint256 hardcap,
        uint256 startTime,
        uint256 endTime,
        uint256 maxBuyPerUser
    ) public returns (uint256) {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenPrice > 0, "Token price must be > 0");
        require(softcap < hardcap, "Softcap must be < hardcap");
        require(startTime < endTime, "Invalid times");
        require(block.timestamp < startTime, "Start time must be in future");
        require(maxBuyPerUser > 0, "Max buy must be > 0");

        uint256 presaleId = presaleCounter++;

        presales[presaleId] = PresaleConfig({
            tokenAddress: tokenAddress,
            owner: msg.sender,
            tokenPrice: tokenPrice,
            softcap: softcap,
            hardcap: hardcap,
            startTime: startTime,
            endTime: endTime,
            maxBuyPerUser: maxBuyPerUser,
            totalRaised: 0,
            isActive: true,
            isFinalized: false
        });

        emit PresaleCreated(
            presaleId,
            tokenAddress,
            msg.sender,
            softcap,
            hardcap,
            startTime,
            endTime
        );

        return presaleId;
    }

    function buyTokens(uint256 presaleId) public payable nonReentrant {
        require(msg.value > 0, "Must send BNB");
        
        PresaleConfig storage config = presales[presaleId];
        require(config.isActive, "Presale not active");
        require(block.timestamp >= config.startTime, "Presale not started");
        require(block.timestamp < config.endTime, "Presale ended");
        require(config.totalRaised + msg.value <= config.hardcap, "Hardcap exceeded");

        UserContribution storage userContrib = contributions[presaleId][msg.sender];
        require(
            userContrib.amount + msg.value <= config.maxBuyPerUser,
            "Exceeds max buy per user"
        );

        uint256 tokenAmount = (msg.value * 1e18) / config.tokenPrice;

        // Defense in depth: never accept BNB unless the seller has deposited
        // enough tokens to cover this buy plus everything already committed.
        uint256 alreadyCommitted = (config.totalRaised * 1e18) / config.tokenPrice;
        require(
            presaleTokensFunded[presaleId] >= alreadyCommitted + tokenAmount,
            "Presale underfunded"
        );

        if (userContrib.amount == 0) {
            presaleContributors[presaleId].push(msg.sender);
        }

        userContrib.amount += msg.value;
        userContrib.tokenAmount += tokenAmount;
        config.totalRaised += msg.value;

        emit TokensPurchased(presaleId, msg.sender, msg.value, tokenAmount);
    }

    function claimTokens(uint256 presaleId) public nonReentrant {
        PresaleConfig storage config = presales[presaleId];
        UserContribution storage userContrib = contributions[presaleId][msg.sender];

        require(block.timestamp > config.endTime, "Presale not ended");
        require(config.totalRaised >= config.softcap, "Softcap not reached");
        require(userContrib.amount > 0, "No contribution");
        require(!userContrib.claimed, "Already claimed");

        userContrib.claimed = true;

        IERC20 token = IERC20(config.tokenAddress);
        require(
            token.transfer(msg.sender, userContrib.tokenAmount),
            "Token transfer failed"
        );

        emit TokensClaimed(presaleId, msg.sender, userContrib.tokenAmount);
    }

    function withdrawFunds(uint256 presaleId) public nonReentrant {
        PresaleConfig storage config = presales[presaleId];
        require(msg.sender == config.owner, "Only owner can withdraw");
        require(block.timestamp > config.endTime, "Presale not ended");
        require(config.totalRaised >= config.softcap, "Softcap not reached");
        require(!config.isFinalized, "Already finalized");

        config.isFinalized = true;

        uint256 fee = (config.totalRaised * platformFee) / 10000;
        uint256 ownerAmount = config.totalRaised - fee;

        (bool successFee, ) = payable(feeRecipient).call{value: fee}("");
        require(successFee, "Fee transfer failed");

        (bool successOwner, ) = payable(msg.sender).call{value: ownerAmount}("");
        require(successOwner, "Withdrawal failed");

        emit FundsWithdrawn(presaleId, ownerAmount);
    }

    function refundContribution(uint256 presaleId) public nonReentrant {
        PresaleConfig storage config = presales[presaleId];
        UserContribution storage userContrib = contributions[presaleId][msg.sender];

        require(block.timestamp > config.endTime, "Presale not ended");
        require(config.totalRaised < config.softcap, "Softcap reached");
        require(userContrib.amount > 0, "No contribution");
        require(!userContrib.claimed, "Already claimed");

        uint256 amount = userContrib.amount;
        userContrib.claimed = true;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund failed");

        emit RefundClaimed(presaleId, msg.sender, amount);
    }

    /// @notice Recover seller-deposited tokens when a presale failed (softcap not
    ///         reached). Without this, tokens funded via {fundPresale} would be
    ///         stranded in this contract forever — buyers get BNB refunds via
    ///         {refundContribution}, but the seller's tokens have no return path.
    /// @dev Idempotent: zeroes out the funded balance on first call so a second
    ///      call reverts with "Nothing to recover".
    function recoverFundedTokensOnFailure(uint256 presaleId) public nonReentrant {
        PresaleConfig storage config = presales[presaleId];
        require(config.tokenAddress != address(0), "Presale does not exist");
        require(msg.sender == config.owner, "Only presale owner");
        require(block.timestamp > config.endTime, "Presale not ended");
        require(config.totalRaised < config.softcap, "Softcap reached");

        uint256 amount = presaleTokensFunded[presaleId];
        require(amount > 0, "Nothing to recover");

        presaleTokensFunded[presaleId] = 0;

        IERC20 token = IERC20(config.tokenAddress);
        require(
            token.transfer(msg.sender, amount),
            "Token transfer failed"
        );

        emit OwnerTokensRecovered(presaleId, msg.sender, amount);
    }

    /// @notice Deposit tokens into the presale so buyers can later claim.
    /// @dev Caller must approve the Launchpad for `amount` on the presale token first.
    ///      Anyone can call this, but funds are accounted to `presaleId`.
    ///      Restricted to the presale owner to keep accounting clean and to prevent
    ///      grief-funding by third parties.
    function fundPresale(uint256 presaleId, uint256 amount) public nonReentrant {
        PresaleConfig storage config = presales[presaleId];
        require(config.tokenAddress != address(0), "Presale does not exist");
        require(msg.sender == config.owner, "Only presale owner");
        require(amount > 0, "Amount must be > 0");
        require(!config.isFinalized, "Presale already finalized");

        presaleTokensFunded[presaleId] += amount;

        IERC20 token = IERC20(config.tokenAddress);
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Token transferFrom failed"
        );

        emit PresaleFunded(presaleId, msg.sender, amount);
    }

    /// @notice Worst-case token amount required to fully fill the presale at hardcap.
    function getRequiredTokens(uint256 presaleId) public view returns (uint256) {
        PresaleConfig storage config = presales[presaleId];
        if (config.tokenPrice == 0) return 0;
        return (config.hardcap * 1e18) / config.tokenPrice;
    }

    /// @notice Convenience view: (required at hardcap, deposited so far, already committed to buyers).
    function getFundingStatus(uint256 presaleId)
        public
        view
        returns (uint256 required, uint256 funded, uint256 committed)
    {
        PresaleConfig storage config = presales[presaleId];
        if (config.tokenPrice == 0) {
            return (0, presaleTokensFunded[presaleId], 0);
        }
        required = (config.hardcap * 1e18) / config.tokenPrice;
        funded = presaleTokensFunded[presaleId];
        committed = (config.totalRaised * 1e18) / config.tokenPrice;
    }

    function getPresaleDetails(uint256 presaleId)
        public
        view
        returns (PresaleConfig memory)
    {
        return presales[presaleId];
    }

    function getUserContribution(uint256 presaleId, address user)
        public
        view
        returns (UserContribution memory)
    {
        return contributions[presaleId][user];
    }

    function getPresaleContributors(uint256 presaleId)
        public
        view
        returns (address[] memory)
    {
        return presaleContributors[presaleId];
    }

    function setFeeRecipient(address newFeeRecipient) public onlyOwner {
        require(newFeeRecipient != address(0), "Invalid address");
        feeRecipient = newFeeRecipient;
    }

    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
}
