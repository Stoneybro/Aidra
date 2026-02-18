// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.28;

import {HookConfig, ValidationFlags} from "@erc6900/src/interfaces/IERC6900Account.sol";
import {ValidationConfigLib} from "@erc6900/src/libraries/ValidationConfigLib.sol";
import {IEntryPoint} from "@eth-infinitism/interfaces/IEntryPoint.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LibClone} from "solady/utils/LibClone.sol";
import {AidraModularAccount} from "../AidraModularAccount.sol";

contract AidraAccountFactory is Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    AidraModularAccount public immutable ACCOUNT_IMPL;
    IEntryPoint public immutable ENTRY_POINT;
    address public immutable SINGLE_SIGNER_VALIDATION_MODULE;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/
    event AidraModularAccountDeployed(address indexed account, address indexed owner, uint256 salt);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error InvalidAction();
    error TransferFailed();
    error NoCodeAccountImpl();

    /*CONSTRUCTOR*/
    constructor(address owner, address _accountImpl, address _entryPoint, address _singleSignerValidationModule)
        Ownable(owner)
    {
        ACCOUNT_IMPL = AidraModularAccount(_accountImpl);
        ENTRY_POINT = IEntryPoint(_entryPoint);
        SINGLE_SIGNER_VALIDATION_MODULE = _singleSignerValidationModule;
        if (address(_accountImpl).code.length == 0) {
            revert NoCodeAccountImpl();
        }
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function CreateAccount(address _owner, uint256 _salt, uint32 _entityId) external returns (AidraModularAccount) {
        bytes32 combinedSalt = keccak256(abi.encodePacked(_owner, _salt, _entityId));
        (bool alreadyDeployed, address instance) =
            LibClone.createDeterministicERC1967(address(ACCOUNT_IMPL), combinedSalt);
        if (!alreadyDeployed) {
            bytes memory moduleInstallData = abi.encode(_entityId, _owner);
            AidraModularAccount(payable(instance))
                .initializeWithValidation(
                    ValidationConfigLib.pack(SINGLE_SIGNER_VALIDATION_MODULE, _entityId, true, true, true),
                    new bytes4[](0),
                    moduleInstallData,
                    new bytes[](0)
                );
            emit AidraModularAccountDeployed(instance, _owner, _salt);
        }
        return AidraModularAccount(payable(instance));
    }

    function getAddress(address _owner, uint256 _salt, uint32 _entityId) external view returns (address) {
        bytes32 combinedSalt = keccak256(abi.encodePacked(_owner, _salt, _entityId));
        return LibClone.predictDeterministicAddressERC1967(address(ACCOUNT_IMPL), combinedSalt, address(this));
    }

    function renounceOwnership() public view override onlyOwner {
        revert InvalidAction();
    }

    function addStake(uint32 unstakeDelay) external payable onlyOwner {
        ENTRY_POINT.addStake{value: msg.value}(unstakeDelay);
    }
    function unlockStake() external onlyOwner {
        ENTRY_POINT.unlockStake();
    }

    function withdrawStake(address payable withdrawAddress) external onlyOwner {
        ENTRY_POINT.withdrawStake(withdrawAddress);
    }

    function withdraw(address payable to, address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success,) = to.call{value: address(this).balance}("");
            if (!success) {
                revert TransferFailed();
            }
        } else {
            SafeERC20.safeTransfer(IERC20(token), to, amount);
        }
    }


}

