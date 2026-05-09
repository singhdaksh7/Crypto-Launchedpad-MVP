// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LaunchpadToken is ERC20, Ownable {
    /// @param mintTo Address that receives the full initial supply and ownership.
    ///        When deployed via the TokenFactory, this is the EOA that called the factory,
    ///        so the creator — not the factory contract — ends up holding the tokens.
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address mintTo
    ) ERC20(name, symbol) Ownable() {
        require(mintTo != address(0), "Invalid mint recipient");
        _mint(mintTo, initialSupply * 10 ** decimals());
        if (mintTo != msg.sender) {
            _transferOwnership(mintTo);
        }
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
