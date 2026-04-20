// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LaunchpadToken.sol";

contract TokenFactory {
    address[] public createdTokens;
    mapping(address => address) public tokenCreators;
    mapping(address => bool) public isCreatedToken;

    event TokenCreated(
        address indexed creator,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 supply
    );

    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) public returns (address) {
        LaunchpadToken token = new LaunchpadToken(name, symbol, initialSupply);
        address tokenAddress = address(token);

        createdTokens.push(tokenAddress);
        tokenCreators[tokenAddress] = msg.sender;
        isCreatedToken[tokenAddress] = true;

        emit TokenCreated(msg.sender, tokenAddress, name, symbol, initialSupply);
        return tokenAddress;
    }

    function getCreatedTokensCount() public view returns (uint256) {
        return createdTokens.length;
    }

    function getCreatedTokens() public view returns (address[] memory) {
        return createdTokens;
    }

    function getTokensByCreator(address creator) public view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < createdTokens.length; i++) {
            if (tokenCreators[createdTokens[i]] == creator) {
                count++;
            }
        }

        address[] memory tokens = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < createdTokens.length; i++) {
            if (tokenCreators[createdTokens[i]] == creator) {
                tokens[index] = createdTokens[i];
                index++;
            }
        }
        return tokens;
    }
}
