export const BridgePolicyABI=[
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_CHAIN_NAME_LENGTH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_GUARDIANS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addGuardian",
    "inputs": [
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowChain",
    "inputs": [
      {
        "name": "chain",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowedChains",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approveOperation",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "destinationChain",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "zcashTxHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "authorizeBridgeOperation",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "destinationChain",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "zcashTxHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "requiresGuardians",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "bridgeExecutor",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelStuckOperation",
    "inputs": [
      {
        "name": "operationHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createPolicy",
    "inputs": [
      {
        "name": "dailyLimit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "perTxLimit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "guardianThreshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "guardiansRequired",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "allowedChainList",
        "type": "string[]",
        "internalType": "string[]"
      },
      {
        "name": "guardianList",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "decrementPendingOperations",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disallowChain",
    "inputs": [
      {
        "name": "chain",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executedOperations",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "executorSet",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getApprovalCount",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operationHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGuardians",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPolicy",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct BridgePolicy.Policy",
        "components": [
          {
            "name": "dailyLimit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "perTxLimit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "dailySpent",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastResetTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "guardianThreshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "guardiansRequired",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "isActive",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "guardians",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasGuardianApproved",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operationHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isChainAllowed",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "chain",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isGuardian",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingApprovals",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "approvalCount",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "executed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOperationsCount",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "policies",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "dailyLimit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "perTxLimit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "dailySpent",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "lastResetTime",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "guardianThreshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "guardiansRequired",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "isActive",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "removeGuardian",
    "inputs": [
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setBridgeExecutor",
    "inputs": [
      {
        "name": "_bridgeExecutor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updatePolicy",
    "inputs": [
      {
        "name": "dailyLimit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "perTxLimit",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "guardianThreshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "guardiansRequired",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "BridgeExecutorUpdated",
    "inputs": [
      {
        "name": "oldExecutor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newExecutor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ChainAllowed",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "chain",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ChainDisallowed",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "chain",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuardianAdded",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "guardian",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuardianApprovalReceived",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "operationHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "guardian",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "totalApprovals",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuardianRemoved",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "guardian",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperationAuthorized",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "operationHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "destinationChain",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperationCancelled",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "operationHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperationRejected",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "operationHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PolicyCreated",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "dailyLimit",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "perTxLimit",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "guardianThreshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PolicyUpdated",
    "inputs": [
      {
        "name": "aaWallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "dailyLimit",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "perTxLimit",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "guardianThreshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BridgePolicy__AlreadyApproved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__AlreadyExecuted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__ChainAlreadyAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__ChainNameTooLong",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__ChainNotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__ChainNotAllowedYet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__DuplicateGuardian",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__EmptyChainName",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__ExceedsDailyLimit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__ExceedsPerTxLimit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__GuardianApprovalRequired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__GuardianHasPendingApprovals",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__GuardianThresholdTooHigh",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__InsufficientGuardians",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__InvalidGuardianCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__InvalidLimit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__NotEnoughApprovals",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__NotEnoughGuardiansRemaining",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__NotGuardian",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__PendingOperations",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__PolicyAlreadyExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__PolicyNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__TooManyGuardians",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__Unauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BridgePolicy__ZeroAddress",
    "inputs": []
  }
] as const
