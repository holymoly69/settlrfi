import { useState, useEffect, useCallback } from 'react';
import { formatEther, parseEther, type Address } from 'viem';
import { 
  publicClient, 
  createWalletClientFromProvider, 
  switchToHyperEvm,
  activeChain,
  vaultAbi,
  erc20Abi,
  VAULT_ADDRESS,
  HYPE_TOKEN_ADDRESS,
} from '@/lib/wagmi';

interface WalletState {
  address: Address | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  isCorrectChain: boolean;
  hypeBalance: string;
  vaultBalance: string;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    isCorrectChain: false,
    hypeBalance: '0',
    vaultBalance: '0',
  });

  // Check if MetaMask is available
  const hasMetaMask = typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;

  // Connect wallet
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('Please install MetaMask to use this feature');
    }

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0] as Address;

      // Switch to HyperEVM
      await switchToHyperEvm();

      // Get chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string;

      const numericChainId = parseInt(chainId, 16);
      const isCorrectChain = numericChainId === activeChain.id;

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

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      isCorrectChain: false,
      hypeBalance: '0',
      vaultBalance: '0',
    });
  }, []);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!state.address || VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return;
    }

    try {
      // Get HYPE token balance
      const hypeBalance = await publicClient.readContract({
        address: HYPE_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [state.address],
      });

      // Get vault balance
      const vaultBalance = await publicClient.readContract({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'getBalance',
        args: [state.address],
      });

      setState(prev => ({
        ...prev,
        hypeBalance: formatEther(hypeBalance),
        vaultBalance: formatEther(vaultBalance),
      }));
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  }, [state.address]);

  // Deposit HYPE to vault
  const deposit = useCallback(async (amount: string) => {
    if (!state.address || VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      throw new Error('Vault not deployed yet');
    }

    const walletClient = await createWalletClientFromProvider();
    const amountWei = parseEther(amount);

    // Check current allowance
    const currentAllowance = await publicClient.readContract({
      address: HYPE_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [state.address, VAULT_ADDRESS],
    });

    // Only approve if current allowance is insufficient
    if (currentAllowance < amountWei) {
      // If there's a non-zero allowance, reset to zero first (ERC-20 safety pattern)
      if (currentAllowance > BigInt(0)) {
        const resetHash = await walletClient.writeContract({
          address: HYPE_TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: 'approve',
          args: [VAULT_ADDRESS, BigInt(0)],
          account: state.address,
          chain: activeChain,
        });
        await publicClient.waitForTransactionReceipt({ hash: resetHash });
      }

      // Now approve the requested amount
      const approveHash = await walletClient.writeContract({
        address: HYPE_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VAULT_ADDRESS, amountWei],
        account: state.address,
        chain: activeChain,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    // Then deposit
    const depositHash = await walletClient.writeContract({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: 'deposit',
      args: [amountWei],
      account: state.address,
      chain: activeChain,
    });

    // Wait for deposit confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });

    // Refresh balances
    await fetchBalances();

    return receipt;
  }, [state.address, fetchBalances]);

  // Withdraw HYPE from vault
  const withdraw = useCallback(async (amount: string) => {
    if (!state.address || VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      throw new Error('Vault not deployed yet');
    }

    const walletClient = await createWalletClientFromProvider();
    const amountWei = parseEther(amount);

    const withdrawHash = await walletClient.writeContract({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: 'withdraw',
      args: [amountWei],
      account: state.address,
      chain: activeChain,
    });

    // Wait for withdrawal confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

    // Refresh balances
    await fetchBalances();

    return receipt;
  }, [state.address, fetchBalances]);

  // Listen for account changes
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
        isCorrectChain: numericChainId === activeChain.id,
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  // Fetch balances when address changes
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
    deposit,
    withdraw,
    fetchBalances,
    switchToHyperEvm,
  };
}
