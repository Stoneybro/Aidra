// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IAccount} from "@account-abstraction/interfaces/IAccount.sol";
import {PackedUserOperation} from "@account-abstraction/interfaces/PackedUserOperation.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {_packValidationData} from "@account-abstraction/core/Helpers.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title Aidra Smart Wallet
 * @author Zion Livingstone
 * @notice ERC-4337-compatible smart account with ECDSA authentication.
 *         Supports standard Ethereum private key signatures for blockchain transactions.
 * @dev Uses secp256k1 elliptic curve signatures (standard Ethereum ECDSA).
 *      Compatible with ERC-4337 EntryPoint v0.7.
 * @custom:security-contact stoneybrocrypto@gmail.com
 */
contract AidraSmartWallet is IAccount, ReentrancyGuard, Initializable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/

    /// @notice Represents a call to make.
    struct Call {
        /// @dev The address to call.
        address target;
        /// @dev The value to send when making the call.
        uint256 value;
        /// @dev The data of the call.
        bytes data;
    }



    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The owner address that controls this wallet.
    /// @dev Used for ECDSA signature verification.
    address public s_owner;

    /// @notice EIP-1271 magic return value for valid signatures.
    /// @dev Returns 0x1626ba7e when signature is valid, 0xffffffff otherwise.
    bytes4 internal constant _EIP1271_MAGICVALUE = 0x1626ba7e;

    /// @notice EIP-1271 magic value for invalid signatures.
    bytes4 internal constant _EIP1271_INVALID = 0xffffffff;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a single execute is performed.
    /// @param target The address that was called.
    /// @param value The ETH value sent with the call.
    /// @param data The calldata sent.
    event Executed(address indexed target, uint256 value, bytes data);

    /// @notice Emitted when a batch execute is performed.
    /// @param batchSize The number of calls in the batch.
    /// @param totalValue The total ETH value sent across all calls.
    event ExecutedBatch(uint256 indexed batchSize, uint256 totalValue);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when caller is not the EntryPoint.
    error AidraSmartWallet__NotFromEntryPoint();

    /// @notice Thrown when caller is neither EntryPoint nor owner.
    error AidraSmartWallet__Unauthorized();

    /// @notice Thrown when owner address is zero (invalid owner).
    error AidraSmartWallet__InvalidOwner();

    /// @notice Thrown when the wallet is not initialized.
    error AidraSmartWallet__NotInitialized();

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Reverts if the caller is not the EntryPoint.
    modifier onlyEntryPoint() {
        if (msg.sender != entryPoint()) {
            revert AidraSmartWallet__NotFromEntryPoint();
        }
        _;
    }

    /// @notice Reverts if the wallet has not been initialized.
    modifier onlyInitialized() {
        if (s_owner == address(0)) {
            revert AidraSmartWallet__NotInitialized();
        }
        _;
    }

    /**
     * @notice Sends to the EntryPoint (i.e. `msg.sender`) the missing funds for this transaction.
     * @dev Subclass MAY override this modifier for better funds management (e.g. send to the
     *      EntryPoint more than the minimum required, so that in future transactions it will not
     *      be required to send again).
     * @param missingAccountFunds The minimum value this modifier should send the EntryPoint which
     *                            MAY be zero, in case there is enough deposit, or the userOp has a
     *                            paymaster.
     */
    modifier payPrefund(uint256 missingAccountFunds) {
        _;

        assembly ("memory-safe") {
            if missingAccountFunds {
                // Ignore failure (it's EntryPoint's job to verify, not the account's).
                pop(call(gas(), caller(), missingAccountFunds, codesize(), 0x00, codesize(), 0x00))
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Constructor prevents initialization of implementation contract.
    /// @dev This ensures the implementation contract cannot be used directly.
    constructor() {
        _disableInitializers();
    }

    /*//////////////////////////////////////////////////////////////
                           INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the account with the owner address.
     * @dev Reverts if the account has already been initialized.
     *      Reverts if owner address is zero (invalid owner).
     *      This function is called by the factory after deploying the clone.
     * @param owner The address that will control this wallet.
     */
    function initialize(address owner) external initializer {
        if (owner == address(0)) revert AidraSmartWallet__InvalidOwner();
        s_owner = owner;
    }

    /*//////////////////////////////////////////////////////////////
                         ERC-4337 FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IAccount
     * @notice ERC-4337 `validateUserOp` method. The EntryPoint will call this to validate
     *         the UserOperation before execution.
     * @dev Signature failure should be reported by returning 1. This allows making a "simulation call"
     *      without a valid signature. Other failures should still revert.
     *      Empty signatures are treated as invalid (returns validation failure).
     *      Chain ID is included in the hash to prevent cross-chain replay attacks.
     * @param userOp The `UserOperation` to validate.
     * @param userOpHash The hash of the `UserOperation`, computed by EntryPoint.
     * @param missingAccountFunds The missing account funds that must be deposited on the EntryPoint.
     * @return validationData The encoded `ValidationData` structure:
     *         `(uint256(validAfter) << (160 + 48)) | (uint256(validUntil) << 160) | (success ? 0 : 1)`
     *         where validUntil is 0 (indefinite) and validAfter is 0.
     */
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        onlyEntryPoint
        payPrefund(missingAccountFunds)
        returns (uint256 validationData)
    {
        // Empty signature means validation failure
        if (userOp.signature.length == 0) {
            return _packValidationData(true, 0, 0);
        }

        // Convert hash to Ethereum signed message hash
        bytes32 ethSignedMessageHash = userOpHash.toEthSignedMessageHash();

        // Recover signer from signature
        address recovered = ethSignedMessageHash.recover(userOp.signature);

        // Verify recovered address matches owner
        bool valid = (recovered == s_owner);

        // Return 0 for valid, 1 for invalid
        return _packValidationData(!valid, 0, 0);
    }

    /*//////////////////////////////////////////////////////////////
                         EXECUTION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a single call from this account.
     * @dev Can only be called by the EntryPoint.
     *      Protected by reentrancy guard.
     *      Wallet must be initialized before execution.
     * @param target The address to call.
     * @param value The value to send with the call.
     * @param data The data of the call.
     */
    function execute(address target, uint256 value, bytes calldata data)
        external
        payable
        nonReentrant
        onlyEntryPoint
        onlyInitialized
    {
        _call(target, value, data);
        emit Executed(target, value, data);
    }

    /**
     * @notice Executes a batch of calls from this account.
     * @dev Can only be called by the EntryPoint.
     *      Protected by reentrancy guard.
     *      Wallet must be initialized before execution.
     * @param calls The list of `Call`s to execute.
     */
    function executeBatch(Call[] calldata calls) external payable nonReentrant onlyEntryPoint onlyInitialized {
        uint256 totalValue = 0;
        uint256 length = calls.length;

        for (uint256 i; i < length; i++) {
            totalValue += calls[i].value;
            _call(calls[i].target, calls[i].value, calls[i].data);
        }

        emit ExecutedBatch(length, totalValue);
    }


    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the address of the EntryPoint v0.7.
     * @return The address of the EntryPoint v0.7 contract.
     */
    function entryPoint() public pure returns (address) {
        return 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    }

    /**
     * @notice EIP-1271 signature validation for contract signatures and off-chain tooling.
     * @dev Validates ECDSA signatures against the stored owner address.
     *      Returns magic value 0x1626ba7e if valid, 0xffffffff otherwise.
     *      For off-chain signatures, uses EIP-191 Ethereum signed message format.
     * @param hash The hash that was signed.
     * @param signature The signature bytes (standard 65-byte ECDSA signature).
     * @return magicValue `_EIP1271_MAGICVALUE` (0x1626ba7e) if valid, `_EIP1271_INVALID` (0xffffffff) otherwise.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4) {
        // Empty signature is invalid
        if (signature.length == 0) {
            return _EIP1271_INVALID;
        }

        // Convert hash to Ethereum signed message hash
        bytes32 ethSignedMessageHash = hash.toEthSignedMessageHash();

        // Recover signer from signature
        address recovered = ethSignedMessageHash.recover(signature);

        // Verify recovered address matches owner
        bool valid = (recovered == s_owner);

        return valid ? _EIP1271_MAGICVALUE : _EIP1271_INVALID;
    }

    /**
     * @notice Returns the owner address.
     * @dev Useful for off-chain verification and debugging.
     * @return owner The address that controls this wallet.
     */
    function getOwner() external view returns (address owner) {
        return s_owner;
    }

    /*//////////////////////////////////////////////////////////////
                         INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Executes a call from this account.
     * @dev Reverts with the original error if the call fails.
     * @param target The address to call.
     * @param value The value to send with the call.
     * @param data The calldata to send.
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly ("memory-safe") {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                         RECEIVE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Allows the contract to receive ETH.
    receive() external payable {}

    /// @notice Fallback function to receive ETH.
    fallback() external payable {}
}
