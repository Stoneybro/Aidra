// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AidraSmartWallet} from "./AidraSmartWallet.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/**
 * @title Aidra Smart Wallet Factory
 * @author Zion Livingstone
 * @notice Factory for deploying ERC-1167 minimal proxy clones of Aidra Smart Wallet.
 *         Creates deterministic wallet addresses based on owner address.
 * @dev Uses CREATE2 for deterministic deployments. Each unique owner address gets a unique wallet.
 * @custom:security-contact stoneybrocrypto@gmail.com
 */
contract AidraSmartWalletFactory {
    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Address of the AidraSmartWallet implementation used for new account clones.
    /// @dev All deployed wallets are ERC-1167 minimal proxies pointing to this implementation.
    address public immutable implementation;

    /// @notice Mapping from owner address to deployed SmartAccount clone address.
    /// @dev Key is the owner's Ethereum address.
    mapping(address owner => address wallet) public wallets;

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when a new account is created.
     * @param account The address of the created account.
     * @param owner The address that controls the account.
     */
    event AccountCreated(address indexed account, address indexed owner);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Thrown when trying to construct with an implementation that has no code.
     */
    error AidraSmartWalletFactory__ImplementationUndeployed();

    /**
     * @notice Thrown when trying to create a wallet with invalid owner (zero address).
     */
    error AidraSmartWalletFactory__InvalidOwner();

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Factory constructor used to initialize the implementation address to use for future
     *         AidraSmartWallet deployments.
     * @dev Reverts if the implementation address has no code deployed.
     * @param _implementation The address of the AidraSmartWallet implementation which new accounts will proxy to.
     */
    constructor(address _implementation) {
        if (_implementation.code.length == 0) {
            revert AidraSmartWalletFactory__ImplementationUndeployed();
        }
        implementation = _implementation;
    }

    /*//////////////////////////////////////////////////////////////
                              FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deploys and initializes a deterministic AidraSmartWallet for a specific owner address,
     *         or returns the existing account if already deployed.
     * @dev Deployed as an ERC-1167 minimal proxy whose implementation is `this.implementation`.
     *      Uses owner address to generate a unique salt via CREATE2, ensuring one wallet per owner.
     *      This function is compatible with ERC-4337 initCode deployment pattern.
     * @param owner The address that will control the wallet.
     * @return account The address of the ERC-1167 proxy created for this owner, or the existing
     *                 account address if already deployed.
     */
    function createSmartAccount(address owner) public returns (address account) {
        // Validate owner
        if (owner == address(0)) {
            revert AidraSmartWalletFactory__InvalidOwner();
        }

        // Generate salt from owner address
        bytes32 salt = _getSalt(owner);
        address predictedAddress = Clones.predictDeterministicAddress(implementation, salt, address(this));

        // Return existing account if already deployed
        if (predictedAddress.code.length != 0) {
            return predictedAddress;
        }

        // Deploy new account using CREATE2
        account = Clones.cloneDeterministic(implementation, salt);

        // Initialize with owner address
        AidraSmartWallet(payable(account)).initialize(owner);

        // Record mapping for lookup
        wallets[owner] = account;

        emit AccountCreated(account, owner);
    }

    /**
     * @notice Returns the deterministic address of the account that would be created for given owner.
     * @dev This address is deterministic across all chains due to CREATE2.
     *      Useful for counterfactual wallet address computation before deployment.
     * @param owner The address that will control the wallet.
     * @return The predicted account deployment address.
     */
    function getPredictedAddress(address owner) external view returns (address) {
        bytes32 salt = _getSalt(owner);
        return Clones.predictDeterministicAddress(implementation, salt, address(this));
    }

    /**
     * @notice Returns the deployed account for a given owner or zero address if none exists.
     * @dev Checks the wallets mapping for an existing deployment.
     * @param owner The address that controls the wallet.
     * @return The deployed account address, or address(0) if not deployed.
     */
    function getWallet(address owner) external view returns (address) {
        return wallets[owner];
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Generates the CREATE2 salt for `Clones.predictDeterministicAddress`.
     * @dev Salt is derived from owner address to ensure deterministic, unique addresses.
     * @param owner The address that will control the wallet.
     * @return The computed salt for CREATE2 deployment.
     */
    function _getSalt(address owner) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(owner)));
    }
}