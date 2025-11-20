import { createPimlicoClient } from "permissionless/clients/pimlico";
import {http } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";

// Bundler URL with API key + sponsorship policy
export const pimlicoBundlerUrl = `https://api.pimlico.io/v2/84532/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}&sponsorshipPolicyId=${process.env.NEXT_PUBLIC_PIMPLICO_SPONSOR_ID}`;
export const pimlicoBundlerTransport = http(pimlicoBundlerUrl);

// Pimlico client for account abstraction (ERC-4337)
export const pimlicoClient = createPimlicoClient({
  transport: pimlicoBundlerTransport,
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
});
