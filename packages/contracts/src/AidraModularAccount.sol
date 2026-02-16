// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IAccount} from "@eth-infinitism/interfaces/IAccount.sol";
import {IEntryPoint} from "@eth-infinitism/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@eth-infinitism/interfaces/PackedUserOperation.sol";
import {AidraAccountBase} from "./AidraAccountBase.sol";

contract AidraModularAccount is AidraAccountBase{
    constructor() AidraAccountBase(_ENTRY_POINT){

    }

    function _validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash) internal override  returns (uint256 validationData) {
        
    }
}