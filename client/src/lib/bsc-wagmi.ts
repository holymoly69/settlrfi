import { defineChain } from "viem";

export const bscMainnet = defineChain({
  id: 56,
  name: 'BNB Smart Chain',
  network: 'bsc',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'BNB',
  },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.binance.org'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
});

export const bscTestnet = defineChain({
  id: 97,
  name: 'BNB Smart Chain Testnet',
  network: 'bsc-testnet',
  testnet: true,
  nativeCurrency: {
    decimals: 18,
    name: 'tBNB',
    symbol: 'tBNB',
  },
  rpcUrls: {
    default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] },
  },
  blockExplorers: {
    default: { name: 'BscScan Testnet', url: 'https://testnet.bscscan.com' },
  },
});

export const activeBscChain = bscTestnet;

export const BSC_VAULT_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const BSC_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
