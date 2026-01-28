import type { Position, Market, CrossMarginMetrics } from "@shared/schema";
import { getMarketState } from "./simulation";

const MAINTENANCE_FACTOR = 0.5;
const WARNING_THRESHOLD = 1.2;

export function calculatePositionPnL(position: Position, currentPrice: number): number {
  const isLong = position.side === "YES";
  const entryProb = parseFloat(position.entryProbability.toString());
  const pnl = isLong
    ? (position.size * (currentPrice - entryProb)) / 100
    : (position.size * (entryProb - currentPrice)) / 100;
  return pnl;
}

export function calculatePositionMargin(position: Position): number {
  // Leverage is sanitized at position creation time to always be >= 1
  // If somehow invalid (legacy data), log warning and use 1 as safe fallback
  if (!position.leverage || position.leverage <= 0) {
    console.warn(`[riskEngine] Position ${position.id} has invalid leverage: ${position.leverage}. Using 1.`);
    return position.size; // size / 1 = size
  }
  return Math.ceil(position.size / position.leverage);
}

export function calculateCrossMarginMetrics(
  cashBalance: number,
  openPositions: (Position & { market: Market })[],
  getPrice: (marketId: number) => number | null
): CrossMarginMetrics {
  let usedMargin = 0;
  let unrealizedPnL = 0;
  let maintenanceMargin = 0;

  for (const pos of openPositions) {
    const margin = calculatePositionMargin(pos);
    usedMargin += margin;
    maintenanceMargin += margin * MAINTENANCE_FACTOR;

    const currentPrice = getPrice(pos.marketId) ?? parseFloat(pos.market?.currentProbability?.toString() ?? "50");
    const pnl = calculatePositionPnL(pos, currentPrice);
    unrealizedPnL += pnl;
  }

  const equity = cashBalance + usedMargin + unrealizedPnL;
  const freeMargin = Math.max(0, equity - usedMargin);
  const marginRatio = maintenanceMargin > 0 ? equity / maintenanceMargin : Infinity;
  const isAtRisk = marginRatio < WARNING_THRESHOLD && marginRatio >= 1;

  return {
    cashBalance,
    usedMargin,
    unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
    equity: Math.round(equity * 100) / 100,
    freeMargin: Math.round(freeMargin * 100) / 100,
    maintenanceMargin: Math.round(maintenanceMargin * 100) / 100,
    marginRatio: Math.round(marginRatio * 100) / 100,
    isAtRisk,
  };
}

export function calculateDynamicLiquidationPrice(
  position: Position,
  portfolioEquity: number,
  portfolioMaintenance: number,
  otherPositionsPnL: number,
  getPrice: (marketId: number) => number | null
): number {
  const margin = calculatePositionMargin(position);
  const positionMaintenance = margin * MAINTENANCE_FACTOR;
  const otherMaintenance = portfolioMaintenance - positionMaintenance;
  const currentPrice = getPrice(position.marketId) ?? parseFloat(position.entryProbability.toString());
  const currentPnL = calculatePositionPnL(position, currentPrice);
  const equityWithoutThisPos = portfolioEquity - currentPnL;

  const isLong = position.side === "YES";

  const requiredDrop = (equityWithoutThisPos - portfolioMaintenance) * 100 / position.size;
  const requiredRise = (equityWithoutThisPos - portfolioMaintenance) * 100 / position.size;

  const liqPrice = isLong
    ? currentPrice - requiredDrop
    : currentPrice + requiredRise;

  return Math.max(0, Math.min(100, Math.round(liqPrice * 100) / 100));
}

export function getPositionsToLiquidate(
  openPositions: (Position & { market: Market })[],
  equity: number,
  maintenanceMargin: number,
  getPrice: (marketId: number) => number | null
): Position[] {
  if (equity >= maintenanceMargin) {
    return [];
  }

  const positionsWithRisk = openPositions
    .map(pos => {
      const currentPrice = getPrice(pos.marketId) ?? parseFloat(pos.market?.currentProbability?.toString() ?? "50");
      const pnl = calculatePositionPnL(pos, currentPrice);
      const margin = calculatePositionMargin(pos);
      const lossRatio = pnl / margin;
      return { position: pos, pnl, margin, lossRatio };
    })
    .sort((a, b) => a.lossRatio - b.lossRatio);

  const toLiquidate: Position[] = [];
  let currentEquity = equity;
  let currentMaintenance = maintenanceMargin;

  for (const { position, pnl, margin } of positionsWithRisk) {
    if (currentEquity >= currentMaintenance) break;

    toLiquidate.push(position);
    const positionMaintenance = margin * MAINTENANCE_FACTOR;
    currentMaintenance -= positionMaintenance;
  }

  return toLiquidate;
}
