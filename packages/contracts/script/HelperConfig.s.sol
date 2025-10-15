// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {EntryPoint} from "lib/account-abstraction/contracts/core/EntryPoint.sol";
import {Script} from "forge-std/Script.sol";

contract HelperConfig is Script {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/
    struct NetworkConfig {
        address implementation;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    NetworkConfig public localNetwork;
    uint256 constant BASE_SEPOLIA_CHAIN_ID = 84532;
    uint256 constant LOCAL_CHAIN_ID = 31337;
    address constant BURNER_WALLET = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant SEPOLIA_WALLET = 0x0D96081998fd583334fd1757645B40fdD989B267;
    uint256 constant OWNER_PRIVATE_KEY = 1;
    address public immutable signingAccount;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/
    error HelperConfig__UnsupportedNetwork();

    /*CONSTRUCTOR*/
    constructor() {
        signingAccount = vm.addr(OWNER_PRIVATE_KEY);
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getConfig() external returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public returns (NetworkConfig memory) {
        if (chainId == LOCAL_CHAIN_ID) {
            return getAnvilEthConfig();
        } else if (chainId == BASE_SEPOLIA_CHAIN_ID) {
            return getBaseSepoliaEthConfig();
        } else {
            revert HelperConfig__UnsupportedNetwork();
        }
    }

    function getBaseSepoliaEthConfig() public pure returns (NetworkConfig memory) {
        return NetworkConfig({implementation: 0xbfEC49a63Dc711B02731cbcFc8C5b7F15d07BeEa});
    }

    function getAnvilEthConfig() public returns (NetworkConfig memory) {
        if (localNetwork.implementation != address(0)) {
            return localNetwork;
        }

        // Deploy new EntryPoint for local network

        localNetwork = NetworkConfig({implementation: address(0)});

        return localNetwork;
    }
}
