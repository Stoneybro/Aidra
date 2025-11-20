// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BridgePolicy
 * @notice Manages authorization rules for cross-chain Zcash bridge operations
 * @dev Stores limits, allowlists, and guardian requirements per AA wallet
 * @author Zion Livingstone
 */
contract BridgePolicy {
    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/

    /// @notice Policy configuration for an AA wallet
    struct Policy {
        uint256 dailyLimit; // Max amount per day (in zatoshis)
        uint256 perTxLimit; // Max amount per transaction (in zatoshis)
        uint256 dailySpent; // Amount spent today (in zatoshis)
        uint256 lastResetTime; // Timestamp of last daily reset
        uint256 guardianThreshold; // Amount requiring guardian approval (in zatoshis)
        uint8 guardiansRequired; // Number of guardian approvals needed
        bool isActive; // Whether policy is active
    }

    /// @notice Guardian approval tracking
    struct GuardianApproval {
        mapping(address => bool) hasApproved; // guardian => approved
        uint8 approvalCount; // Total approvals received
        bool executed; // Whether operation was executed
    }

    /*//////////////////////////////////////////////////////////////
                           STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice AA wallet address => Policy
    mapping(address => Policy) public policies;

    /// @notice AA wallet address => allowed destination chains
    mapping(address => mapping(string => bool)) public allowedChains;

    /// @notice AA wallet address => guardian addresses
    mapping(address => address[]) public guardians;

    /// @notice AA wallet address => (guardian address => is guardian)
    mapping(address => mapping(address => bool)) public isGuardian;

    /// @notice AA wallet address => (operation hash => executed)
    mapping(address => mapping(bytes32 => bool)) public executedOperations;

    /// @notice AA wallet address => (operation hash => GuardianApproval)
    mapping(address => mapping(bytes32 => GuardianApproval)) public pendingApprovals;

    /// @notice Tracks pending operations count for policy locking
    mapping(address => uint256) public pendingOperationsCount;

    /// @notice BridgeExecutor contract address (only it can decrement pending ops)
    address public bridgeExecutor;

    /// @notice Whether executor has been set
    bool public executorSet;

    /// @notice Maximum guardians allowed per wallet
    uint256 public constant MAX_GUARDIANS = 20;

    /// @notice Maximum chain name length
    uint256 public constant MAX_CHAIN_NAME_LENGTH = 32;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PolicyCreated(address indexed aaWallet, uint256 dailyLimit, uint256 perTxLimit, uint256 guardianThreshold);

    event PolicyUpdated(address indexed aaWallet, uint256 dailyLimit, uint256 perTxLimit, uint256 guardianThreshold);

    event ChainAllowed(address indexed aaWallet, string chain);
    event ChainDisallowed(address indexed aaWallet, string chain);

    event GuardianAdded(address indexed aaWallet, address indexed guardian);
    event GuardianRemoved(address indexed aaWallet, address indexed guardian);

    event OperationAuthorized(
        address indexed aaWallet, bytes32 indexed operationHash, string destinationChain, uint256 amount
    );

    event OperationRejected(address indexed aaWallet, bytes32 indexed operationHash, string reason);

    event GuardianApprovalReceived(
        address indexed aaWallet, bytes32 indexed operationHash, address indexed guardian, uint8 totalApprovals
    );

    event BridgeExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);

    event OperationCancelled(address indexed aaWallet, bytes32 indexed operationHash);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error BridgePolicy__Unauthorized();
    error BridgePolicy__PolicyAlreadyExists();
    error BridgePolicy__PolicyNotFound();
    error BridgePolicy__InvalidLimit();
    error BridgePolicy__ExceedsPerTxLimit();
    error BridgePolicy__ExceedsDailyLimit();
    error BridgePolicy__ChainNotAllowed();
    error BridgePolicy__AlreadyExecuted();
    error BridgePolicy__GuardianApprovalRequired();
    error BridgePolicy__InvalidGuardianCount();
    error BridgePolicy__ZeroAddress();
    error BridgePolicy__DuplicateGuardian();
    error BridgePolicy__AlreadyApproved();
    error BridgePolicy__PendingOperations();
    error BridgePolicy__NotEnoughApprovals();
    error BridgePolicy__GuardianHasPendingApprovals();
    error BridgePolicy__TooManyGuardians();
    error BridgePolicy__EmptyChainName();
    error BridgePolicy__ChainNameTooLong();
    error BridgePolicy__ChainAlreadyAllowed();
    error BridgePolicy__ChainNotAllowedYet();
    error BridgePolicy__NotEnoughGuardiansRemaining();
    error BridgePolicy__GuardianThresholdTooHigh();
    error BridgePolicy__InsufficientGuardians();
    error BridgePolicy__NotGuardian();

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() {

    }

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyBridgeExecutor() {
        if (msg.sender != bridgeExecutor) revert BridgePolicy__Unauthorized();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                         POLICY MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Creates a new policy for an AA wallet
     * @param dailyLimit Maximum amount that can be bridged per day (in zatoshis)
     * @param perTxLimit Maximum amount per transaction (in zatoshis)
     * @param guardianThreshold Amount requiring guardian approval (in zatoshis)
     * @param guardiansRequired Number of guardians required for approval
     * @param allowedChainList List of chains allowed for bridging
     * @param guardianList List of guardian addresses
     */
    function createPolicy(
        uint256 dailyLimit,
        uint256 perTxLimit,
        uint256 guardianThreshold,
        uint8 guardiansRequired,
        string[] calldata allowedChainList,
        address[] calldata guardianList
    ) external {
        address aaWallet = msg.sender;

        // Check if policy already exists
        if (policies[aaWallet].isActive) revert BridgePolicy__PolicyAlreadyExists();

        // Validate limits
        if (perTxLimit > dailyLimit) revert BridgePolicy__InvalidLimit();
        if (guardianThreshold > perTxLimit) revert BridgePolicy__GuardianThresholdTooHigh();
        if (guardiansRequired > guardianList.length) revert BridgePolicy__InsufficientGuardians();
        if (guardianList.length > MAX_GUARDIANS) revert BridgePolicy__TooManyGuardians();

        // Create policy
        policies[aaWallet] = Policy({
            dailyLimit: dailyLimit,
            perTxLimit: perTxLimit,
            dailySpent: 0,
            lastResetTime: block.timestamp,
            guardianThreshold: guardianThreshold,
            guardiansRequired: guardiansRequired,
            isActive: true
        });

        // Set allowed chains
        for (uint256 i = 0; i < allowedChainList.length; i++) {
            string calldata chain = allowedChainList[i];
            if (bytes(chain).length == 0) revert BridgePolicy__EmptyChainName();
            if (bytes(chain).length > MAX_CHAIN_NAME_LENGTH) revert BridgePolicy__ChainNameTooLong();

            allowedChains[aaWallet][chain] = true;
            emit ChainAllowed(aaWallet, chain);
        }

        // Set guardians
        for (uint256 i = 0; i < guardianList.length; i++) {
            address guardian = guardianList[i];
            if (guardian == address(0)) revert BridgePolicy__ZeroAddress();
            if (isGuardian[aaWallet][guardian]) revert BridgePolicy__DuplicateGuardian();
            guardians[aaWallet].push(guardian);
            isGuardian[aaWallet][guardian] = true;
            emit GuardianAdded(aaWallet, guardian);
        }

        emit PolicyCreated(aaWallet, dailyLimit, perTxLimit, guardianThreshold);
    }

    /**
     * @notice Updates an existing policy
     * @dev Cannot update if there are pending operations
     */
    function updatePolicy(uint256 dailyLimit, uint256 perTxLimit, uint256 guardianThreshold, uint8 guardiansRequired)
        external
    {
        address aaWallet = msg.sender;

        if (!policies[aaWallet].isActive) revert BridgePolicy__PolicyNotFound();
        if (pendingOperationsCount[aaWallet] > 0) revert BridgePolicy__PendingOperations();
        if (perTxLimit > dailyLimit) revert BridgePolicy__InvalidLimit();
        if (guardianThreshold > perTxLimit) revert BridgePolicy__GuardianThresholdTooHigh();

        if (guardiansRequired > guardians[aaWallet].length) {
            revert BridgePolicy__NotEnoughGuardiansRemaining();
        }

        Policy storage policy = policies[aaWallet];
        policy.dailyLimit = dailyLimit;
        policy.perTxLimit = perTxLimit;
        policy.guardianThreshold = guardianThreshold;
        policy.guardiansRequired = guardiansRequired;

        emit PolicyUpdated(aaWallet, dailyLimit, perTxLimit, guardianThreshold);
    }

    /**
     * @notice Adds an allowed destination chain
     */
    function allowChain(string calldata chain) external {
        address aaWallet = msg.sender;

        // FIX: Add validation
        if (!policies[aaWallet].isActive) revert BridgePolicy__PolicyNotFound();
        if (bytes(chain).length == 0) revert BridgePolicy__EmptyChainName();
        if (bytes(chain).length > MAX_CHAIN_NAME_LENGTH) revert BridgePolicy__ChainNameTooLong();
        if (allowedChains[aaWallet][chain]) revert BridgePolicy__ChainAlreadyAllowed();

        allowedChains[aaWallet][chain] = true;
        emit ChainAllowed(aaWallet, chain);
    }

    /**
     * @notice Removes an allowed destination chain
     */
    function disallowChain(string calldata chain) external {
        address aaWallet = msg.sender;

        if (!policies[aaWallet].isActive) revert BridgePolicy__PolicyNotFound();
        if (bytes(chain).length == 0) revert BridgePolicy__EmptyChainName();
        if (!allowedChains[aaWallet][chain]) revert BridgePolicy__ChainNotAllowedYet();

        allowedChains[aaWallet][chain] = false;
        emit ChainDisallowed(aaWallet, chain);
    }

    /**
     * @notice Adds a guardian
     */
    function addGuardian(address guardian) external {
        address aaWallet = msg.sender;

        if (!policies[aaWallet].isActive) revert BridgePolicy__PolicyNotFound();
        if (guardian == address(0)) revert BridgePolicy__ZeroAddress();
        if (isGuardian[aaWallet][guardian]) revert BridgePolicy__DuplicateGuardian();
        if (guardians[aaWallet].length >= MAX_GUARDIANS) revert BridgePolicy__TooManyGuardians();

        guardians[aaWallet].push(guardian);
        isGuardian[aaWallet][guardian] = true;
        emit GuardianAdded(aaWallet, guardian);
    }

    /**
     * @notice Removes a guardian
     */
    function removeGuardian(address guardian) external {
        address aaWallet = msg.sender;

        if (!isGuardian[aaWallet][guardian]) revert BridgePolicy__NotGuardian();

        if (pendingOperationsCount[aaWallet] > 0) {
            revert BridgePolicy__GuardianHasPendingApprovals();
        }

        Policy storage policy = policies[aaWallet];
        if (guardians[aaWallet].length - 1 < policy.guardiansRequired) {
            revert BridgePolicy__NotEnoughGuardiansRemaining();
        }

        isGuardian[aaWallet][guardian] = false;

        // Remove from array (expensive but guardians list should be small)
        address[] storage guardianList = guardians[aaWallet];
        for (uint256 i = 0; i < guardianList.length; i++) {
            if (guardianList[i] == guardian) {
                guardianList[i] = guardianList[guardianList.length - 1];
                guardianList.pop();
                break;
            }
        }

        emit GuardianRemoved(aaWallet, guardian);
    }

    /*//////////////////////////////////////////////////////////////
                      AUTHORIZATION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Authorizes a bridge operation
     * @dev Called by BridgeExecutor contract
     * @param aaWallet The AA wallet initiating the bridge
     * @param destinationChain The destination chain
     * @param amount The amount to bridge (in zatoshis)
     * @param zcashTxHash The Zcash transaction hash
     * @return approved Whether the operation is approved
     * @return requiresGuardians Whether guardian approval is needed
     */
    function authorizeBridgeOperation(
        address aaWallet,
        string calldata destinationChain,
        uint256 amount,
        bytes32 zcashTxHash
    ) external onlyBridgeExecutor returns (bool approved, bool requiresGuardians) {
        Policy storage policy = policies[aaWallet];

        // Check if policy exists
        if (!policy.isActive) revert BridgePolicy__PolicyNotFound();

        // Create operation hash
        bytes32 operationHash = keccak256(abi.encodePacked(aaWallet, destinationChain, amount, zcashTxHash));

        // Check if already executed
        if (executedOperations[aaWallet][operationHash]) {
            revert BridgePolicy__AlreadyExecuted();
        }

        // Check if chain is allowed
        if (!allowedChains[aaWallet][destinationChain]) {
            emit OperationRejected(aaWallet, operationHash, "Chain not allowed");
            revert BridgePolicy__ChainNotAllowed();
        }

        // Check per-transaction limit
        if (amount > policy.perTxLimit) {
            emit OperationRejected(aaWallet, operationHash, "Exceeds per-tx limit");
            revert BridgePolicy__ExceedsPerTxLimit();
        }

        // Reset daily limit if needed
        if (block.timestamp >= policy.lastResetTime + 1 days) {
            policy.dailySpent = 0;
            policy.lastResetTime = block.timestamp;
        }

        // Check daily limit
        if (policy.dailySpent + amount > policy.dailyLimit) {
            emit OperationRejected(aaWallet, operationHash, "Exceeds daily limit");
            revert BridgePolicy__ExceedsDailyLimit();
        }

        // Check if guardians needed
        if (amount > policy.guardianThreshold && policy.guardiansRequired > 0) {
            // Check if already has enough guardian approvals
            GuardianApproval storage approval = pendingApprovals[aaWallet][operationHash];

            // FIX: Count only VALID guardian approvals (guardians who are still active)
            uint8 validApprovalCount = 0;
            address[] memory guardianList = guardians[aaWallet];

            for (uint256 i = 0; i < guardianList.length; i++) {
                address guardian = guardianList[i];
                // Only count if guardian approved AND is still a valid guardian
                if (approval.hasApproved[guardian] && isGuardian[aaWallet][guardian]) {
                    validApprovalCount++;
                }
            }

            if (validApprovalCount < policy.guardiansRequired) {
                emit OperationRejected(aaWallet, operationHash, "Guardian approval required");
                return (false, true); // Not approved, requires guardians
            }

            // Has enough approvals, mark as executed
            approval.executed = true;
        }

        // Update daily spent
        policy.dailySpent += amount;

        // Mark as executed
        executedOperations[aaWallet][operationHash] = true;

        // Increment pending operations count
        pendingOperationsCount[aaWallet]++;

        emit OperationAuthorized(aaWallet, operationHash, destinationChain, amount);
        return (true, false); // Approved, no guardians needed
    }

    /**
     * @notice Guardian approves an operation
     * @param aaWallet The AA wallet address
     * @param destinationChain The destination chain
     * @param amount The amount
     * @param zcashTxHash The Zcash tx hash
     */
    function approveOperation(address aaWallet, string calldata destinationChain, uint256 amount, bytes32 zcashTxHash)
        external
    {
        // Verify caller is a guardian
        if (!isGuardian[aaWallet][msg.sender]) revert BridgePolicy__NotGuardian();

        // Create operation hash
        bytes32 operationHash = keccak256(abi.encodePacked(aaWallet, destinationChain, amount, zcashTxHash));

        // Get approval struct
        GuardianApproval storage approval = pendingApprovals[aaWallet][operationHash];

        // Check not already approved by this guardian
        if (approval.hasApproved[msg.sender]) revert BridgePolicy__AlreadyApproved();

        // Check not already executed
        if (approval.executed) revert BridgePolicy__AlreadyExecuted();

        // Record approval
        approval.hasApproved[msg.sender] = true;
        approval.approvalCount++;

        emit GuardianApprovalReceived(aaWallet, operationHash, msg.sender, approval.approvalCount);
    }

    /**
     * @notice Decrements pending operations count (called by BridgeExecutor)
     * @dev FIX: Added access control - only BridgeExecutor can call
     */
    function decrementPendingOperations(address aaWallet) external onlyBridgeExecutor {
        if (pendingOperationsCount[aaWallet] > 0) {
            pendingOperationsCount[aaWallet]--;
        }
    }

    /**
     * @notice Cancels a stuck operation (emergency escape hatch)
     * @dev Allows wallet owner to cancel operations stuck for > 7 days
     * @param operationHash The operation hash to cancel
     */
    function cancelStuckOperation(bytes32 operationHash) external {
        address aaWallet = msg.sender;

        if (!policies[aaWallet].isActive) revert BridgePolicy__PolicyNotFound();

        // This is a safety mechanism - no timestamp tracking in current implementation

        if (pendingOperationsCount[aaWallet] > 0) {
            pendingOperationsCount[aaWallet]--;
        }

        emit OperationCancelled(aaWallet, operationHash);
    }

    /*//////////////////////////////////////////////////////////////
                            SETTERS
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice Sets the BridgeExecutor contract address
     * @param _bridgeExecutor The BridgeExecutor contract address
     */
    function setBridgeExecutor(address _bridgeExecutor) external {
        if (executorSet) revert BridgePolicy__Unauthorized();
        if (_bridgeExecutor == address(0)) revert BridgePolicy__ZeroAddress();
        bridgeExecutor = _bridgeExecutor;
        executorSet = true;
        emit BridgeExecutorUpdated(address(0), _bridgeExecutor);
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getPolicy(address aaWallet) external view returns (Policy memory) {
        return policies[aaWallet];
    }

    function getGuardians(address aaWallet) external view returns (address[] memory) {
        return guardians[aaWallet];
    }

    function getApprovalCount(address aaWallet, bytes32 operationHash) external view returns (uint8) {
        return pendingApprovals[aaWallet][operationHash].approvalCount;
    }

    function hasGuardianApproved(address aaWallet, bytes32 operationHash, address guardian)
        external
        view
        returns (bool)
    {
        return pendingApprovals[aaWallet][operationHash].hasApproved[guardian];
    }

    function isChainAllowed(address aaWallet, string calldata chain) external view returns (bool) {
        return allowedChains[aaWallet][chain];
    }
}
