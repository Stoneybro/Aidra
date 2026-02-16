// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IAccount} from "@eth-infinitism/interfaces/IAccount.sol";
import {IEntryPoint} from "@eth-infinitism/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@eth-infinitism/interfaces/PackedUserOperation.sol";

abstract contract AidraAccountBase is IAccount {
    //validate userop
    //not entrypoint
    IEntryPoint internal immutable _ENTRY_POINT;

    error NotEntryPoint();

    constructor(IEntryPoint _entryPoint){
        _ENTRY_POINT=_entryPoint;
    }



    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)  external  override returns (uint256 validationData) {
        _requireFromEntryPoint();

        validationData=_validateUserOp(userOp,userOpHash);

        assembly ("memory-safe") {
            if missingAccountFunds {
                pop(call(gas(), caller(), missingAccountFunds, codesize(), 0x00, codesize(), 0x00))
            }
        }

    }

    function _validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash)  internal virtual returns (uint256 validationData);
    function _requireFromEntryPoint() view internal {
        if (msg.sender!=address(_ENTRY_POINT)) {
            revert NotEntryPoint();
        }
    }

        function entryPoint() external view returns (IEntryPoint) {
        return _ENTRY_POINT;
    }
}
