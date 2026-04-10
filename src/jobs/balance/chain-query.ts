import { ethers } from "ethers";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("RPC timeout")), ms)),
  ]);
}

export async function getNativeBalance(
  provider: ethers.JsonRpcProvider,
  address: string,
  decimals: number,
  timeoutMs: number,
): Promise<string> {
  const balance = await withTimeout(provider.getBalance(address), timeoutMs);
  return ethers.formatUnits(balance, decimals);
}

export async function getTokenBalance(
  provider: ethers.JsonRpcProvider,
  address: string,
  contractAddress: string,
  decimals: number,
  timeoutMs: number,
): Promise<string> {
  const erc20 = new ethers.Contract(contractAddress, ERC20_ABI, provider);
  const balance = await withTimeout(erc20.balanceOf(address), timeoutMs);
  return ethers.formatUnits(balance, decimals);
}
