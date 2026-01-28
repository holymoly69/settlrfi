import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, clearCsrfToken } from "@/lib/queryClient";
import { switchToBscTestnet } from "@/hooks/use-bsc-wallet";
import { bscTestnet } from "@/lib/bsc-wagmi";

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

async function connectWalletBsc(): Promise<WalletUser> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Please install MetaMask, Rabby, or another Web3 wallet to continue');
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  }) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No wallet accounts found. Please unlock your wallet and try again.');
  }

  const walletAddress = accounts[0];

  await switchToBscTestnet();

  const chainId = await window.ethereum.request({
    method: 'eth_chainId',
  }) as string;

  const numericChainId = parseInt(chainId, 16);
  if (numericChainId !== bscTestnet.id) {
    throw new Error(`Please switch to ${bscTestnet.name} network in your wallet`);
  }

  const challengeResponse = await apiRequest("POST", "/api/auth/challenge", {
    walletAddress,
  });
  
  if (!challengeResponse.ok) {
    const error = await challengeResponse.json();
    throw new Error(error.message || 'Failed to get authentication challenge');
  }
  
  const { nonce } = await challengeResponse.json();

  const message = `Sign in to Settlr BSC\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nNonce: ${nonce}`;

  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress],
  }) as string;

  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');

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

export function useBscAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<WalletUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const connectMutation = useMutation({
    mutationFn: connectWalletBsc,
    onSuccess: (data) => {
      clearCsrfToken();
      queryClient.setQueryData(["/api/auth/user"], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearCsrfToken();
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

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
