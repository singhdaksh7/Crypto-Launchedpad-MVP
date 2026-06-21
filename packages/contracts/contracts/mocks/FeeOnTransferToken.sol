// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Test-only token that burns a fixed percentage of every transfer, so the
///      recipient receives less than the requested amount. Used to verify the
///      Launchpad credits the actual delivered balance, not the requested amount.
contract FeeOnTransferToken is ERC20 {
    uint256 public constant FEE_BPS = 1000; // 10%

    constructor(uint256 initialSupply) ERC20("Fee Token", "FEE") {
        _mint(msg.sender, initialSupply);
    }

    function _transfer(address from, address to, uint256 amount) internal override {
        uint256 fee = (amount * FEE_BPS) / 10000;
        super._transfer(from, to, amount - fee);
        if (fee > 0) {
            _burn(from, fee);
        }
    }
}
