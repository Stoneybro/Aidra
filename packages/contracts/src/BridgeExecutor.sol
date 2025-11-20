// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {BridgePolicy} from "./BridgePolicy.sol";

/**
 * @title BridgeExecutor
 * @notice Main bridge contract that receives Zcash deposits and initiates cross-chain swaps
 * @dev Validates Zcash proofs, checks policies, and emits events for relayer
 * @dev This contract is tightly coupled with the BridgePolicy contract
 */
contract BridgeExecutor {
    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/

    enum OperationStatus {
        Pending,   // Submitted, waiting execution
        Completed, // Successfully bridged
        Failed,    // Execution failed
        Refunded   // User withdrew ZEC
    }

    struct BridgeOperation {
        address aaWallet;
        uint256 amount; // Amount in zatoshis
        bytes32 zcashTxHash;
        string destinationChain;
        string recipientAddress;
        string zcashRefundAddress; 
        OperationStatus status;
        uint256 timestamp;
        bool requiresGuardians;
    }

    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Reference to the policy contract
    BridgePolicy public immutable policyContract;

    /// @notice Zcash tx hash => BridgeOperation
    mapping(bytes32 => BridgeOperation) public operations;

    /// @notice Relayer address (can submit Zcash proofs)
    address public relayer;

    /// @notice Owner address (can update relayer)
    address public owner;

    /// @notice Minimum confirmations required for Zcash tx
    uint256 public constant MIN_CONFIRMATIONS = 10;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BridgeRequested(
        address indexed aaWallet,
        string destinationChain,
        uint256 amount,
        bytes32 indexed zcashTxHash,
        string recipientAddress,
        string zcashRefundAddress 
    );

    event BridgeCompleted(bytes32 indexed zcashTxHash, address indexed aaWallet, string externalTxId);

    event BridgeFailed(bytes32 indexed zcashTxHash, address indexed aaWallet, string reason);

    event RefundRequested(address indexed aaWallet, uint256 amount, bytes32 indexed zcashTxHash);

    event RefundCompleted(bytes32 indexed zcashTxHash, address indexed aaWallet);

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error BridgeExecutor__Unauthorized();
    error BridgeExecutor__InvalidProof();
    error BridgeExecutor__OperationAlreadyExists();
    error BridgeExecutor__OperationNotFound();
    error BridgeExecutor__CannotRefundYet();
    error BridgeExecutor__InvalidStatus();
    error BridgeExecutor__GuardianApprovalRequired();
    error BridgeExecutor__InvalidPolicyAddress();
    error BridgeExecutor__InvalidRelayerAddress();
    error BridgeExecutor__InvalidStatusTransition();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert BridgeExecutor__Unauthorized();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert BridgeExecutor__Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _policyContract, address _relayer) {
        if (_policyContract == address(0)) revert BridgeExecutor__InvalidPolicyAddress();
        if (_relayer == address(0)) revert BridgeExecutor__InvalidRelayerAddress();
        policyContract = BridgePolicy(_policyContract);
        relayer = _relayer;
        owner = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                           BRIDGE OPERATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initiates a bridge operation
     * @dev Called by relayer after detecting Zcash deposit
     * @param aaWallet The AA wallet address (from memo)
     * @param destinationChain The destination chain (from memo)
     * @param amount The amount in zatoshis
     * @param zcashTxHash The Zcash transaction hash
     * @param recipientAddress The recipient address on destination chain
     * @param zcashRefundAddress The Zcash address to refund to if failed (from memo)
     * @param proof Proof data (block height, merkle proof, etc.) - mocked for hackathon
     */
    function initiateBridge(
        address aaWallet,
        string calldata destinationChain,
        uint256 amount,
        bytes32 zcashTxHash,
        string calldata recipientAddress,
        string calldata zcashRefundAddress, 
        bytes calldata proof
    ) external onlyRelayer {
        // Check if operation already exists
        if (operations[zcashTxHash].aaWallet != address(0)) {
            revert BridgeExecutor__OperationAlreadyExists();
        }

        // Verify proof (mocked for hackathon - just check non-empty)
        if (proof.length == 0) revert BridgeExecutor__InvalidProof();

        // Try to authorize with policy
        (bool approved, bool requiresGuardians) =
            policyContract.authorizeBridgeOperation(aaWallet, destinationChain, amount, zcashTxHash);

        // Store operation
        operations[zcashTxHash] = BridgeOperation({
            aaWallet: aaWallet,
            amount: amount,
            zcashTxHash: zcashTxHash,
            destinationChain: destinationChain,
            recipientAddress: recipientAddress,
            zcashRefundAddress: zcashRefundAddress, 
            status: OperationStatus.Pending,
            timestamp: block.timestamp,
            requiresGuardians: requiresGuardians
        });

        if (approved && !requiresGuardians) {
            // Emit event for relayer to execute bridge
            emit BridgeRequested(aaWallet, destinationChain, amount, zcashTxHash, recipientAddress, zcashRefundAddress);
        } else if (requiresGuardians) {
            // Operation pending guardian approval
            // Relayer will check guardian approvals and call retryBridge()
        } else {
            // Authorization failed
            operations[zcashTxHash].status = OperationStatus.Failed;
            emit BridgeFailed(zcashTxHash, aaWallet, "Policy authorization failed");
        }
    }

    /**
     * @notice Retries a bridge operation after guardian approval
     * @dev Called by relayer once guardians have approved
     */
    function retryBridge(bytes32 zcashTxHash) external onlyRelayer {
        BridgeOperation storage operation = operations[zcashTxHash];

        if (operation.aaWallet == address(0)) revert BridgeExecutor__OperationNotFound();
        if (operation.status != OperationStatus.Pending) revert BridgeExecutor__InvalidStatus();

        bytes32 operationHash = keccak256(
            abi.encodePacked(operation.aaWallet, operation.destinationChain, operation.amount, operation.zcashTxHash)
        );
        uint8 approvalCount = policyContract.getApprovalCount(operation.aaWallet, operationHash);
        BridgePolicy.Policy memory policy = policyContract.getPolicy(operation.aaWallet);

        if (approvalCount >= policy.guardiansRequired) {
            emit BridgeRequested(
                operation.aaWallet,
                operation.destinationChain,
                operation.amount,
                operation.zcashTxHash,
                operation.recipientAddress,
                operation.zcashRefundAddress
            );
        } else {
            revert BridgeExecutor__GuardianApprovalRequired();
        }
    }

    /**
     * @notice Marks a bridge operation as completed
     * @dev Called by relayer after successful execution on destination chain
     * @param zcashTxHash The Zcash tx hash
     * @param externalTxId The transaction ID on destination chain
     */
    function completeBridge(bytes32 zcashTxHash, string calldata externalTxId) external onlyRelayer {
        BridgeOperation storage operation = operations[zcashTxHash];

        if (operation.aaWallet == address(0)) revert BridgeExecutor__OperationNotFound();
        if (operation.status != OperationStatus.Pending) {
            revert BridgeExecutor__InvalidStatusTransition();
        }
        operation.status = OperationStatus.Completed;

        // Decrement pending operations in policy
        policyContract.decrementPendingOperations(operation.aaWallet);

        emit BridgeCompleted(zcashTxHash, operation.aaWallet, externalTxId);
    }

    /**
     * @notice Marks a bridge operation as failed
     * @dev Called by relayer if execution fails
     */
    function failBridge(bytes32 zcashTxHash, string calldata reason) external onlyRelayer {
        BridgeOperation storage operation = operations[zcashTxHash];

        if (operation.aaWallet == address(0)) revert BridgeExecutor__OperationNotFound();
        if (operation.status != OperationStatus.Pending) {
            revert BridgeExecutor__InvalidStatusTransition();
        }
        operation.status = OperationStatus.Failed;

        // Decrement pending operations in policy
        policyContract.decrementPendingOperations(operation.aaWallet);

        emit BridgeFailed(zcashTxHash, operation.aaWallet, reason);
    }

    /*//////////////////////////////////////////////////////////////
                           REFUND MECHANISM
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Requests a refund for a failed or stuck operation
     * @dev Can only be called by AA wallet owner after 24 hours or if failed
     */
    function requestRefund(bytes32 zcashTxHash) external {
        BridgeOperation storage operation = operations[zcashTxHash];

        if (operation.aaWallet == address(0)) revert BridgeExecutor__OperationNotFound();
        if (operation.aaWallet != msg.sender) revert BridgeExecutor__Unauthorized();

        // Check if can refund
        bool canRefund = operation.status == OperationStatus.Failed
            || (operation.status == OperationStatus.Pending && block.timestamp > operation.timestamp + 1 days);

        if (!canRefund) revert BridgeExecutor__CannotRefundYet();

        operation.status = OperationStatus.Refunded;

        // Decrement pending operations in policy
        policyContract.decrementPendingOperations(operation.aaWallet);

        emit RefundRequested(operation.aaWallet, operation.amount, zcashTxHash);
    }

    /**
     * @notice Confirms a refund has been processed
     * @dev Called by relayer after sending ZEC back to user
     */
    function confirmRefund(bytes32 zcashTxHash) external onlyRelayer {
        BridgeOperation storage operation = operations[zcashTxHash];

        if (operation.aaWallet == address(0)) revert BridgeExecutor__OperationNotFound();
        if (operation.status != OperationStatus.Refunded) revert BridgeExecutor__InvalidStatus();

        emit RefundCompleted(zcashTxHash, operation.aaWallet);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function updateRelayer(address newRelayer) external onlyOwner {
        address oldRelayer = relayer;
        relayer = newRelayer;
        emit RelayerUpdated(oldRelayer, newRelayer);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getOperation(bytes32 zcashTxHash) external view returns (BridgeOperation memory) {
        return operations[zcashTxHash];
    }
}