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

        userContrib.claimed = true;

        (bool success, ) = payable(msg.sender).call{value: userContrib.amount}("");
        require(success, "Refund failed");
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
