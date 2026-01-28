import { createPublicClient, createWalletClient, custom, http, type Chain } from 'viem';

// HyperEVM chain configurations
export const hyperEvmMainnet: Chain = {
  id: 998,
  name: 'HyperEVM Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: { http: ['https://api.hyperliquid.xyz/evm'] },
    public: { http: ['https://api.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperScan', url: 'https://hyperscan.xyz' },
  },
};

export const hyperEvmTestnet: Chain = {
  id: 998,
  name: 'HyperEVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
    public: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'PurrSec Testnet', url: 'https://testnet.purrsec.com' },
  },
  testnet: true,
};

// Use testnet for development
export const activeChain = hyperEvmTestnet;

// Create public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
});

// Vault contract ABI (minimal for deposit/withdraw)
export const vaultAbi = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balances',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'Deposited',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newBalance', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdrawn',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newBalance', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ERC20 ABI for approvals
export const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// Contract addresses (to be updated after deployment)
export const VAULT_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // TODO: Update after deployment
export const HYPE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const; // TODO: Update with actual HYPE token

// Helper to create wallet client from injected provider (MetaMask)
export async function createWalletClientFromProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const walletClient = createWalletClient({
    chain: activeChain,
    transport: custom(window.ethereum),
  });

  return walletClient;
}

// Helper to switch to HyperEVM network
export async function switchToHyperEvm() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const chainIdHex = `0x${activeChain.id.toString(16)}`;

  // First try to add the chain (this works even if chain exists)
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: chainIdHex,
          chainName: activeChain.name,
          nativeCurrency: activeChain.nativeCurrency,
          rpcUrls: [activeChain.rpcUrls.default.http[0]],
          blockExplorerUrls: activeChain.blockExplorers
            ? [activeChain.blockExplorers.default.url]
            : undefined,
        },
      ],
    });
  } catch (addError: any) {
    // If add fails with "already exists", that's fine - try to switch
    if (addError.code !== 4001) { // 4001 = user rejected
      console.log('Chain may already exist, trying to switch...');
    } else {
      throw addError;
    }
  }

  // Now switch to the chain
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    // If switch fails, try adding again then switching
    if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: activeChain.name,
            nativeCurrency: activeChain.nativeCurrency,
            rpcUrls: [activeChain.rpcUrls.default.http[0]],
            blockExplorerUrls: activeChain.blockExplorers
              ? [activeChain.blockExplorers.default.url]
              : undefined,
          },
        ],
      });
    } else if (switchError.code !== 4001) {
      throw switchError;
    }
  }
}

// Declare ethereum on window for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
