import { createSmartAccountClient } from "permissionless";
import { http } from "viem";
import { baseSepolia } from "viem/chains";
import { pimlicoClient, pimlicoBundlerUrl } from "./pimlico";
import { getPublicClient } from "./client";
import { CustomSmartAccount } from "./customSmartAccount";

// Build a Smart Account client around your custom account
export async function getSmartAccountClient(
  customSmartAccount: CustomSmartAccount
) {
  const publicClient=getPublicClient();
  return createSmartAccountClient({
    account: customSmartAccount,
    chain: baseSepolia,
    client: publicClient,
    bundlerTransport: http(pimlicoBundlerUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const { fast } = await pimlicoClient.getUserOperationGasPrice();
        return {
          maxFeePerGas: BigInt(fast.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(fast.maxPriorityFeePerGas),
        };
      },
    },
  });
}
