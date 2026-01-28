import { useState, useEffect, useCallback } from 'react';
import { formatEther, type Address, createPublicClient, http, createWalletClient, custom } from 'viem';
import { bscTestnet, BSC_VAULT_ADDRESS, BSC_TOKEN_ADDRESS } from '@/lib/bsc-wagmi';

interface BscWalletState {
  address: Address | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  isCorrectChain: boolean;
  bnbBalance: string;
  vaultBalance: string;
}

const bscPublicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

const vaultAbi = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export async function switchToBscTestnet(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask');
  }

  const chainIdHex = `0x${bscTestnet.id.toString(16)}`;
  const chainParams = {
    chainId: chainIdHex,
    chainName: bscTestnet.name,
    nativeCurrency: bscTestnet.nativeCurrency,
    rpcUrls: [bscTestnet.rpcUrls.default.http[0]],
    blockExplorerUrls: bscTestnet.blockExplorers ? [bscTestnet.blockExplorers.default.url] : ['https://testnet.bscscan.com'],
  };

  // First try to add the chain (this works even if chain exists)
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [chainParams],
    });
  } catch (addError: any) {
    // If add fails with "already exists", that's fine - try to switch
    if (addError.code !== 4001) { // 4001 = user rejected
      console.log('BSC chain may already exist, trying to switch...');
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
        params: [chainParams],
      });
    } else if (switchError.code !== 4001) {
      throw switchError;
    }
  }
}

export function useBscWallet() {
  const [state, setState] = useState<BscWalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    isCorrectChain: false,
    bnbBalance: '0',
    vaultBalance: '0',
  });

  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask to use this feature');
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0] as Address;

      await switchToBscTestnet();

      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string;

      const numericChainId = parseInt(chainId, 16);
      const isCorrectChain = numericChainId === bscTestnet.id;

      setState(prev => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        chainId: numericChainId,
        isCorrectChain,
      }));

      return address;
    } catch (error) {
      setState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      isCorrectChain: false,
      bnbBalance: '0',
      vaultBalance: '0',
    });
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!state.address || BSC_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return;
    }

    try {
      const bnbBalance = await bscPublicClient.getBalance({
        address: state.address,
      });

      const vaultBalance = await bscPublicClient.readContract({
        address: BSC_VAULT_ADDRESS as Address,
        abi: vaultAbi,
        functionName: 'getBalance',
        args: [state.address],
      });

      setState(prev => ({
        ...prev,
        bnbBalance: formatEther(bnbBalance),
        vaultBalance: formatEther(vaultBalance),
      }));
    } catch (error) {
      console.error('Error fetching BSC balances:', error);
    }
  }, [state.address]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountsArray = accounts as string[];
      if (accountsArray.length === 0) {
        disconnect();
      } else {
        setState(prev => ({
          ...prev,
          address: accountsArray[0] as Address,
        }));
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      const numericChainId = parseInt(chainId as string, 16);
      setState(prev => ({
        ...prev,
        chainId: numericChainId,
        isCorrectChain: numericChainId === bscTestnet.id,
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  useEffect(() => {
    if (state.address && state.isCorrectChain) {
      fetchBalances();
    }
  }, [state.address, state.isCorrectChain, fetchBalances]);

  return {
    ...state,
    hasMetaMask,
    connect,
    disconnect,
    fetchBalances,
    switchToBscTestnet,
  };
}
