/**
 * Formats zatoshis to ZEC
 */
export function zatoshisToZec(zatoshis: bigint | number): string {
  const zec = Number(zatoshis) / 100000000;
  return zec.toFixed(8);
}

/**
 * Formats ZEC to zatoshis
 */
export function zecToZatoshis(zec: string | number): bigint {
  const zatoshis = Math.floor(Number(zec) * 100000000);
  return BigInt(zatoshis);
}

/**
 * Shortens address for display
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats timestamp to readable date
 */
export function formatDate(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

/**
 * Generates memo string
 */
export function generateMemo(
  aaWallet: string,
  chain: string,
  recipientAddress: string,
  refundAddress: string
): string {
  return `${aaWallet}|${chain}|${recipientAddress}|${refundAddress}`;
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}