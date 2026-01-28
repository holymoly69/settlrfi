import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreatePositionInput } from "@shared/routes";

// Cache for CSRF token
let csrfTokenCache: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;
  const res = await fetch("/api/csrf-token", { credentials: "include" });
  if (res.ok) {
    const data = await res.json();
    csrfTokenCache = data.csrfToken;
    return csrfTokenCache!;
  }
  throw new Error("Failed to fetch CSRF token");
}

// ============================================
// MARKETS
// ============================================

const BUILD_VERSION = "2.0.5";

// Normalize numeric database fields from string to number
// Database numeric types (e.g., numeric(10,2)) are returned as strings by Drizzle
// This is done once at the hook level to avoid scattered parseFloat calls in components
function normalizeMarketProbability<T extends { currentProbability: string | number }>(market: T): T & { currentProbability: number } {
  return {
    ...market,
    currentProbability: typeof market.currentProbability === 'number' 
      ? market.currentProbability 
      : parseFloat(market.currentProbability.toString())
  };
}

// Normalize position probabilities (entryProbability, liquidationProbability) and embedded market
function normalizePositionProbabilities<T extends { 
  entryProbability: string | number; 
  liquidationProbability: string | number;
  market?: { currentProbability: string | number } | null;
}>(position: T): T & { 
  entryProbability: number; 
  liquidationProbability: number;
  market?: { currentProbability: number } | null;
} {
  return {
    ...position,
    entryProbability: typeof position.entryProbability === 'number' 
      ? position.entryProbability 
      : parseFloat(position.entryProbability.toString()),
    liquidationProbability: typeof position.liquidationProbability === 'number' 
      ? position.liquidationProbability 
      : parseFloat(position.liquidationProbability.toString()),
    market: position.market ? normalizeMarketProbability(position.market) : position.market,
  };
}

export function useMarkets(category?: string, status?: "active" | "resolved" | "canceled") {
  return useQuery({
    queryKey: ["/api/markets/v2", category, status, BUILD_VERSION],
    queryFn: async () => {
      const url = new URL("/api/markets/v2", window.location.origin);
      if (category) url.searchParams.set("category", category);
      if (status) url.searchParams.set("status", status);
      url.searchParams.set("_v", BUILD_VERSION);
      url.searchParams.set("_t", Date.now().toString());
      
      const res = await fetch(url.toString(), { 
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch markets");
      const markets = api.markets.list.responses[200].parse(await res.json());
      return markets.map(normalizeMarketProbability);
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function useMarket(id: number) {
  return useQuery({
    queryKey: [api.markets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.markets.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch market");
      const market = api.markets.get.responses[200].parse(await res.json());
      return normalizeMarketProbability(market);
    },
    refetchInterval: 2000, // Real-time updates synced with order book
  });
}

export function useMarketTrades(id: number) {
  return useQuery({
    queryKey: [api.markets.trades.path, id],
    queryFn: async () => {
      const url = buildUrl(api.markets.trades.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trades");
      return api.markets.trades.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Real-time feel
  });
}

// ============================================
// POSITIONS
// ============================================

export function usePositions() {
  return useQuery({
    queryKey: [api.positions.list.path],
    queryFn: async () => {
      const res = await fetch(api.positions.list.path, { credentials: "include" });
      if (res.status === 401) return null; // Handle unauthorized gracefully
      if (!res.ok) throw new Error("Failed to fetch positions");
      const positions = api.positions.list.responses[200].parse(await res.json());
      return positions.map(normalizePositionProbabilities);
    },
    refetchInterval: 3000, // Poll every 3 seconds for live updates
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePositionInput) => {
      const csrfToken = await getCsrfToken();
      const res = await fetch(api.positions.create.path, {
        method: api.positions.create.method,
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid order");
        }
        // If CSRF error, clear cache and provide helpful message
        if (res.status === 403) {
          csrfTokenCache = null;
          throw new Error("Session expired. Please refresh the page.");
        }
        throw new Error("Failed to place order");
      }
      return api.positions.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.positions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/earn/status"] }); // Update STLR points for first trade
      queryClient.invalidateQueries({ queryKey: [api.markets.get.path, variables.marketId] });
    },
  });
}

export function useClosePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const csrfToken = await getCsrfToken();
      const url = buildUrl(api.positions.close.path, { id });
      const res = await fetch(url, { 
        method: api.positions.close.method,
        headers: { "x-csrf-token": csrfToken },
        credentials: "include" 
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          csrfTokenCache = null;
          throw new Error("Session expired. Please refresh the page.");
        }
        throw new Error("Failed to close position");
      }
      return api.positions.close.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.positions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
      queryClient.invalidateQueries({ queryKey: [api.positions.byMarket.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function usePartialClosePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, percent }: { id: number; percent: number }) => {
      const csrfToken = await getCsrfToken();
      const url = buildUrl(api.positions.partialClose.path, { id });
      const res = await fetch(url, { 
        method: api.positions.partialClose.method,
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ percent }),
        credentials: "include" 
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          csrfTokenCache = null;
          throw new Error("Session expired. Please refresh the page.");
        }
        throw new Error("Failed to partially close position");
      }
      return api.positions.partialClose.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.positions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
      queryClient.invalidateQueries({ queryKey: [api.positions.byMarket.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function usePositionsByMarket(marketId: number) {
  return useQuery({
    queryKey: [api.positions.byMarket.path, marketId],
    queryFn: async () => {
      const url = buildUrl(api.positions.byMarket.path, { marketId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch positions");
      return api.positions.byMarket.responses[200].parse(await res.json());
    },
    refetchInterval: 3000,
  });
}

// ============================================
// PORTFOLIO
// ============================================

export function usePortfolioSummary() {
  return useQuery({
    queryKey: [api.portfolio.summary.path],
    queryFn: async () => {
      const res = await fetch(api.portfolio.summary.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch portfolio summary");
      return api.portfolio.summary.responses[200].parse(await res.json());
    },
    refetchInterval: 3000, // Poll every 3 seconds for live updates
  });
}

import type { CrossMarginMetrics } from "@shared/schema";

export function useCrossMarginMetrics() {
  return useQuery<CrossMarginMetrics | null>({
    queryKey: ["/api/portfolio/margin"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio/margin", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch margin metrics");
      return res.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds for live margin updates
  });
}

// ============================================
// COMBOS
// ============================================

import type { Combo } from "@shared/schema";

export function useCombos() {
  return useQuery<Combo[]>({
    queryKey: ["/api/combos"],
    queryFn: async () => {
      const res = await fetch("/api/combos", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch combos");
      return res.json();
    },
  });
}

export function useCombo(id: number) {
  return useQuery<Combo>({
    queryKey: ["/api/combos", id],
    queryFn: async () => {
      const res = await fetch(`/api/combos/${id}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch combo");
      return res.json();
    },
  });
}

// ============================================
// CUSTOM COMBOS (User-Created Parlays)
// ============================================

import type { CustomComboResponse, CreateCustomComboRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useCustomCombos() {
  return useQuery<CustomComboResponse[]>({
    queryKey: ["/api/custom-combos"],
    queryFn: async () => {
      const res = await fetch("/api/custom-combos", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch custom combos");
      return res.json();
    },
  });
}

export function useCustomCombo(id: number) {
  return useQuery<CustomComboResponse>({
    queryKey: ["/api/custom-combos", id],
    queryFn: async () => {
      const res = await fetch(`/api/custom-combos/${id}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch custom combo");
      return res.json();
    },
  });
}

export function useCreateCustomCombo() {
  return useMutation({
    mutationFn: async (data: CreateCustomComboRequest) => {
      const res = await apiRequest("POST", "/api/custom-combos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-combos"] });
    },
  });
}

export interface LiveCustomComboResponse extends CustomComboResponse {
  orderBook?: { bids: { price: number; size: number }[]; asks: { price: number; size: number }[] };
  isLive?: boolean;
}

export function useLiveCustomCombo(id: number) {
  return useQuery<LiveCustomComboResponse>({
    queryKey: ["/api/custom-combos", id, "live"],
    queryFn: async () => {
      const res = await fetch(`/api/custom-combos/${id}/live`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch live custom combo");
      return res.json();
    },
    refetchInterval: 2000,
  });
}

export interface OpenComboPositionInput {
  comboId: number;
  side: "YES" | "NO";
  stake: number;
  leverage: number;
  lockDate: string; // ISO string at 00:00 GMT
  entryProbability: number;
}

export function useOpenComboPosition() {
  return useMutation({
    mutationFn: async (data: OpenComboPositionInput) => {
      const res = await apiRequest("POST", "/api/combo-positions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/combo-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

// Combo position with combo info for portfolio display (time-lock positions)
export interface ComboPositionWithCombo {
  id: number;
  userId: string;
  comboId: number;
  side: "YES" | "NO";
  stake: number;
  leverage: number;
  entryProbability: string;
  exitProbability: string | null;
  lockDate: Date | string;
  pnl: number | null;
  status: "open" | "settled" | "cancelled";
  createdAt: Date | string | null;
  closedAt: Date | string | null;
  combo: CustomComboResponse;
}

export function useComboPositions() {
  return useQuery<ComboPositionWithCombo[] | null>({
    queryKey: ["/api/combo-positions"],
    queryFn: async () => {
      const res = await fetch("/api/combo-positions", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch combo positions");
      return res.json();
    },
    refetchInterval: 3000,
  });
}

export function useCloseComboPosition() {
  return useMutation({
    mutationFn: async (id: number) => {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/combo-positions/${id}/close`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          csrfTokenCache = null;
          throw new Error("Session expired. Please refresh the page.");
        }
        const error = await res.json();
        throw new Error(error.message || "Failed to close combo position");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/combo-positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
    },
  });
}

// ============================================
// ORDERS (Advanced Order Types)
// ============================================

export interface CreateOrderInput {
  marketId: number;
  orderType: "market" | "limit" | "iceberg" | "twap";
  side: "YES" | "NO";
  totalSize: number;
  leverage?: number;
  visibleSize?: number;
  limitPrice?: number;
  twapDurationMs?: number;
  twapIntervalMs?: number;
  expiresAt?: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid order");
        }
        if (res.status === 403) {
          csrfTokenCache = null;
          throw new Error("Session expired. Please refresh the page.");
        }
        throw new Error("Failed to place order");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.positions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.portfolio.summary.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/market", variables.marketId] });
      queryClient.invalidateQueries({ queryKey: [api.markets.get.path, variables.marketId] });
    },
  });
}

import type { Order } from "@shared/schema";

export function useOrdersByMarket(marketId: number) {
  return useQuery<Order[]>({
    queryKey: ["/api/orders/market", marketId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/market/${marketId}`, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    refetchInterval: 3000,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, marketId }: { orderId: number; marketId: number }) => {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          csrfTokenCache = null;
          throw new Error("Session expired. Please refresh the page.");
        }
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel order");
      }
      return { ...(await res.json()), marketId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/market", data.marketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}
