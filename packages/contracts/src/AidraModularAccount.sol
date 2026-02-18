// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IAccount} from "@eth-infinitism/interfaces/IAccount.sol";
import {IEntryPoint} from "@eth-infinitism/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "@eth-infinitism/interfaces/PackedUserOperation.sol";
import {AidraAccountBase} from "./AidraAccountBase.sol";
import {IERC6900Account,ValidationConfig} from "@erc6900/src/interfaces/IERC6900Account.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract AidraModularAccount is AidraAccountBase, Initializable {
    constructor() AidraAccountBase(_ENTRY_POINT) {
        _disableInitializers();
    }
    function initializeWithValidation(
        ValidationConfig validationConfig,
        bytes4[] calldata selectors,
        bytes calldata installData,
        bytes[] calldata callDataHooks
    ) external initializer {}

}
