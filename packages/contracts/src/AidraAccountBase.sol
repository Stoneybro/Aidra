// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IAccount} from "@eth-infinitism/interfaces/IAccount.sol";
import {IEntryPoint} from "@eth-infinitism/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@eth-infinitism/interfaces/PackedUserOperation.sol";
import {ValidationLocatorLib, ValidationLocator, ValidationLookupKey} from "./libraries/ValidatorLocatorLib.sol";
import {AccountStorage, ValidationStorage, getAccountStorage, toSetValue} from "./AidraAccountStorage.sol";
import {ValidationConfigLib} from "@erc6900/src/libraries/ValidationConfigLib.sol";

abstract contract AidraAccountBase is IAccount {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/
    enum ValidationCheckingType {
        GLOBAL,
        SELECTOR,
        EITHER
    }
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    IEntryPoint internal immutable _ENTRY_POINT;
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error NotEntryPoint();
    error UnrecognizedFunction(bytes4 functionSelector);
    error ValidationFunctionMissing(bytes4 selector);
    error SelfCallRecursionDepthExceeded();

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(IEntryPoint _entryPoint) {
        _ENTRY_POINT = _entryPoint;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
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

    function executeUserOps(PackedUserOperation[] calldata ops, address to, bytes calldata data) external {
        _requireFromEntryPoint();
        _executeUserOps(ops, to, data);
    }

    function execute(address to, uint256 value, bytes calldata data) external {
        _requireFromEntryPoint();
        _execute(to, value, data);
    }

    function entryPoint() external view returns (IEntryPoint) {
        return _ENTRY_POINT;
    }

    /*//////////////////////////////////////////////////////////////
                               INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        returns (uint256 validationData)
    {
        ValidationLocator locator = ValidationLocatorLib.loadFromNonce(userOp.nonce);
        bytes calldata userOpSignature = userOp.signature;
        _checkIfValidationAppliesCallData(
            userOp.callData,
            locator.lookupKey(),
            locator.isGlobal() ? ValidationCheckingType.GLOBAL : ValidationCheckingType.SELECTOR
        );
    }

    function _requireFromEntryPoint() internal view {
        if (msg.sender != address(_ENTRY_POINT)) {
            revert NotEntryPoint();
        }
    }

    function _checkIfValidationAppliesCallData(
        bytes calldata callData,
        ValidationLookupKey validationFunction,
        ValidationCheckingType checkingType
    ) internal {
        if (callData.length < 4) {
            revert UnrecognizedFunction(bytes4(callData));
        }
        bytes4 outerSelector = bytes4(callData);
        if (outerSelector == address(this).executeUserOps.selector) {
            callData = callData[4:];
            outerSelector = bytes4(callData[:4]);
        }
        _checkIfValidationAppliesSelector(outerSelector, validationFunction, checkingType);

        if (outerSelector == address(this).execute.selector) {
            address target = MemManagementLib.getExecuteTarget(callData);
            if (target == address(this)) {
                revert SelfCallRecursionDepthExceeded();
            }
        } else if (outerSelector == address(this).executeBatch.selector) {
            _checkExecuteBatchValidationApplicability(callData[4:], validationFunction, checkingType);
        }
    }

    function _checkExecuteBatchValidationApplicability(bytes calldata callData, ValidationLookupKey validationFunction, ValidationCheckingType checkingType) internal view {
        
    }

    function _checkIfValidationAppliesSelector(
        bytes4 selector,
        ValidationLookupKey validationFunction,
        ValidationCheckingType checkingType
    ) internal view {
        if (checkingType == ValidationCheckingType.GLOBAL) {
            if (!_globalValidationApplies(selector, validationFunction)) {
                revert ValidationFunctionMissing(selector);
            }
        } else if (checkingType == ValidationCheckingType.SELECTOR) {
            if (!_selectorValidationApplies(selector, validationFunction)) {
                revert ValidationFunctionMissing(selector);
            }
        } else {
            if (
                !_globalValidationApplies(selector, validationFunction)
                    && !_selectorValidationApplies(selector, validationFunction)
            ) {
                revert ValidationFunctionMissing(selector);
            }
        }
    }

    function _globalValidationApplies(bytes4 selector, ValidationLookupKey validationFunction)
        internal
        view
        returns (bool)
    {
        return _globalValidationAllowed(selector) && _isValidationGlobal(validationFunction);
    }

    function _globalValidationAllowed(bytes4 selector) internal view returns (bool) {
        return getAccountStorage().executionStorage[selector].allowGlobalValidation;
    }

    function _selectorValidationApplies(bytes4 selector, ValidationLookupKey validationFunction)
        internal
        view
        returns (bool)
    {
        return getAccountStorage().validationStorage[validationFunction].selectors.contains(toSetValue(selector));
    }

    function _isValidationGlobal(ValidationLookupKey _validationFunction) internal view returns (bool) {
        return ValidationConfigLib.isGlobal(getAccountStorage().validationStorage[_validationFunction].validationFlags);
    }
}
