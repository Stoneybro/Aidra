// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IAccount} from "@eth-infinitism/interfaces/IAccount.sol";
import {IEntryPoint} from "@eth-infinitism/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@eth-infinitism/interfaces/PackedUserOperation.sol";
import {ValidationLocatorLib, ValidationLocator, ValidationLookupKey} from "./libraries/ValidatorLocatorLib.sol";
import {AccountStorage, ValidationStorage, getAccountStorage, toSetValue} from "./AidraAccountStorage.sol";
import {ValidationConfigLib} from "@erc6900/src/libraries/ValidationConfigLib.sol";

abstract contract AidraAccountBase is IAccount {
    //validate userop
    //not entrypoint
    IEntryPoint internal immutable _ENTRY_POINT;

    error NotEntryPoint();

    constructor(IEntryPoint _entryPoint) {
        _ENTRY_POINT = _entryPoint;
    }

    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        override
        returns (uint256 validationData)
    {
        _requireFromEntryPoint();

        validationData = _validateUserOp(userOp, userOpHash);

        assembly ("memory-safe") {
            if missingAccountFunds {
                pop(call(gas(), caller(), missingAccountFunds, codesize(), 0x00, codesize(), 0x00))
            }
        }
    }

    function _validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        returns (uint256 validationData)
    {
        ValidationLocator locator = ValidationLocatorLib.loadFromNonce(userOp.nonce);
        bytes calldata userOpSignature = userOp.signature;
    }

    function _requireFromEntryPoint() internal view {
        if (msg.sender != address(_ENTRY_POINT)) {
            revert NotEntryPoint();
        }
    }

    function _isValidationGlobal(ValidationLookupKey _validationFunction) internal view returns (bool) {
        return ValidationConfigLib.isGlobal(getAccountStorage().validationStorage[_validationFunction].validationFlags);
    }

    function entryPoint() external view returns (IEntryPoint) {
        return _ENTRY_POINT;
    }
}
