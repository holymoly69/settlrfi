import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, clearCsrfToken } from "@/lib/queryClient";
import { switchToHyperEvm, activeChain } from "@/lib/wagmi";

interface WalletUser {
  id: string;
  walletAddress: string;
  balance: string;
  firstName: string;
  lastName: string;
}

async function fetchUser(): Promise<WalletUser | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function connectWallet(): Promise<WalletUser> {
  // Check if MetaMask/wallet is available
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Please install MetaMask, Rabby, or another Web3 wallet to continue');
  }

  // Request account access
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  }) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No wallet accounts found. Please unlock your wallet and try again.');
  }

  const walletAddress = accounts[0];

  // Switch to HyperEVM network (will prompt to add if not present)
  await switchToHyperEvm();

  // Verify we're on the correct network
  const chainId = await window.ethereum.request({
    method: 'eth_chainId',
  }) as string;

  const numericChainId = parseInt(chainId, 16);
  if (numericChainId !== activeChain.id) {
    throw new Error(`Please switch to ${activeChain.name} network in your wallet`);
  }

  // Request a nonce from the server for signature verification
  const challengeResponse = await apiRequest("POST", "/api/auth/challenge", {
    walletAddress,
  });
  
  if (!challengeResponse.ok) {
    const error = await challengeResponse.json();
    throw new Error(error.message || 'Failed to get authentication challenge');
  }
  
  const { nonce } = await challengeResponse.json();

  // Create a message to sign with the server-issued nonce
  const message = `Sign in to Settlr\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nNonce: ${nonce}`;

  // Request signature from wallet
  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress],
  }) as string;

  // Check for referral code in URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');

  // Send wallet address, message, signature, and nonce to backend for verification
  const response = await apiRequest("POST", "/api/wallet/connect", {
    walletAddress,
    message,
    signature,
    nonce,
    referralCode,
  });
  
  return response.json();
}

async function logout(): Promise<void> {
  await apiRequest("POST", "/api/logout");
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<WalletUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const connectMutation = useMutation({
    mutationFn: connectWallet,
    onSuccess: (data) => {
      clearCsrfToken(); // Clear CSRF token after login - will be refetched for new session
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearCsrfToken(); // Clear CSRF token on logout
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  // Check if wallet is available
  const hasWallet = typeof window !== 'undefined' && !!window.ethereum;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    hasWallet,
  };
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
