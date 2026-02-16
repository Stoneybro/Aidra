// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {HookConfig, ValidationFlags} from "@erc6900/src/interfaces/IERC6900Account.sol";
import {LinkedListSet, SetValue} from "./libraries/LinkedListSetLib.sol";
import {ValidationLookupKey} from "./libraries/ValidatorLocatorLib.sol";
// ERC-7201 derived storage slot
bytes32 constant _ACCOUNT_STORAGE_SLOT = keccak256(abi.encode(uint256(keccak256("AidraModularAccount")) - 1)) & ~bytes32(uint256(0xff));

struct ExecutionStorage{
    address module;
    bool skipRuntimeValidation;
    bool allowGlobalValidation;
    LinkedListSet executionHooks;
}

struct ValidationStorage{
    address module;
    ValidationFlags validationFlags;
    uint8 validationHookCount;
    uint8 executionHookCount;
    LinkedListSet validationHooks;
    LinkedListSet executionHooks;
    LinkedListSet selectors;
}

struct AccountStorage{
    uint64 initialized;
    bool initializinng;
    mapping (bytes4 selector => ExecutionStorage) executionStorage;
    mapping (ValidationLookupKey lookupKey => ValidationStorage) validationstorage;
    mapping(bytes4 => uint256) supportedIfaces;
}

function getAccountStorage() pure  returns (AccountStorage storage s) {
    bytes32 accountS;
    assembly {
        s.slot :=accountS
    }
}

function toSetValue(HookConfig hookConfig) pure returns (SetValue) {
    return SetValue.wrap(bytes31(HookConfig.unwrap(hookConfig)));
}

function toSetValue(bytes4 selector) pure returns (SetValue) {
    return SetValue.wrap(bytes31(selector));
}


