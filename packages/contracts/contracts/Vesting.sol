// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title  Vesting + token timelock
/// @notice Single contract serving two use-cases:
///         - Vesting schedules (cliff + linear) for team / advisor / treasury allocations.
///         - Liquidity locks (cliff-only, linearSeconds = 0) for LP tokens after a launch.
/// @dev    Pull-based: beneficiaries call `release(scheduleId)` to receive vested tokens.
///         Tokens are pulled from the creator on schedule creation via `transferFrom`,
///         so the creator must approve this contract for `totalAmount` first.
contract Vesting is ReentrancyGuard {
    struct Schedule {
        address token;
        address beneficiary;
        address creator;
        uint256 totalAmount;
        uint256 released;
        uint64 start;          // unix seconds — vesting timer starts here
        uint64 cliffSeconds;   // delay from `start` until any tokens are releasable
        uint64 linearSeconds;  // duration of linear release after cliff. 0 = full unlock at cliff.
    }

    Schedule[] private _schedules;
    mapping(address => uint256[]) private _byBeneficiary;
    mapping(address => uint256[]) private _byCreator;

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed token,
        address indexed beneficiary,
        address creator,
        uint256 totalAmount,
        uint64 start,
        uint64 cliffSeconds,
        uint64 linearSeconds
    );

    event Released(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );

    function createSchedule(
        address token,
        address beneficiary,
        uint256 totalAmount,
        uint64 start,
        uint64 cliffSeconds,
        uint64 linearSeconds
    ) external nonReentrant returns (uint256 scheduleId) {
        require(token != address(0), "Invalid token");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be > 0");
        require(cliffSeconds > 0 || linearSeconds > 0, "No vesting period");
        require(cliffSeconds <= 100 * 365 days, "Cliff too long");
        require(linearSeconds <= 100 * 365 days, "Linear too long");

        scheduleId = _schedules.length;
        _schedules.push(
            Schedule({
                token: token,
                beneficiary: beneficiary,
                creator: msg.sender,
                totalAmount: totalAmount,
                released: 0,
                start: start,
                cliffSeconds: cliffSeconds,
                linearSeconds: linearSeconds
            })
        );

        _byBeneficiary[beneficiary].push(scheduleId);
        _byCreator[msg.sender].push(scheduleId);

        // Pull the tokens in. Caller must have approved this contract.
        require(
            IERC20(token).transferFrom(msg.sender, address(this), totalAmount),
            "Token transferFrom failed"
        );

        emit ScheduleCreated(
            scheduleId,
            token,
            beneficiary,
            msg.sender,
            totalAmount,
            start,
            cliffSeconds,
            linearSeconds
        );
    }

    function release(uint256 scheduleId) external nonReentrant {
        require(scheduleId < _schedules.length, "No such schedule");
        Schedule storage s = _schedules[scheduleId];
        require(msg.sender == s.beneficiary, "Only beneficiary");

        uint256 vested = _vestedAmount(s, block.timestamp);
        uint256 releasable = vested - s.released;
        require(releasable > 0, "Nothing to release");

        s.released += releasable;

        require(
            IERC20(s.token).transfer(s.beneficiary, releasable),
            "Token transfer failed"
        );

        emit Released(scheduleId, s.beneficiary, releasable);
    }

    /* ── views ────────────────────────────────────────────────── */

    function vestedOf(uint256 scheduleId) external view returns (uint256) {
        require(scheduleId < _schedules.length, "No such schedule");
        return _vestedAmount(_schedules[scheduleId], block.timestamp);
    }

    function releasableOf(uint256 scheduleId) external view returns (uint256) {
        require(scheduleId < _schedules.length, "No such schedule");
        Schedule storage s = _schedules[scheduleId];
        return _vestedAmount(s, block.timestamp) - s.released;
    }

    function getSchedule(uint256 scheduleId) external view returns (Schedule memory) {
        require(scheduleId < _schedules.length, "No such schedule");
        return _schedules[scheduleId];
    }

    function schedulesOfBeneficiary(address beneficiary)
        external
        view
        returns (uint256[] memory)
    {
        return _byBeneficiary[beneficiary];
    }

    function schedulesOfCreator(address creator)
        external
        view
        returns (uint256[] memory)
    {
        return _byCreator[creator];
    }

    function totalSchedules() external view returns (uint256) {
        return _schedules.length;
    }

    /* ── internal ─────────────────────────────────────────────── */

    function _vestedAmount(Schedule storage s, uint256 timestamp)
        private
        view
        returns (uint256)
    {
        uint256 cliffEnd = uint256(s.start) + uint256(s.cliffSeconds);
        if (timestamp < cliffEnd) {
            return 0;
        }
        if (s.linearSeconds == 0 || timestamp >= cliffEnd + uint256(s.linearSeconds)) {
            return s.totalAmount;
        }
        return (s.totalAmount * (timestamp - cliffEnd)) / uint256(s.linearSeconds);
    }
}
