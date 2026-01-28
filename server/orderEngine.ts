import { storage } from "./storage";
import type { Order, Market, Position } from "@shared/schema";
import { getMarketState } from "./simulation";

function calculateLiquidationProbability(
  entryProbability: number,
  leverage: number,
  side: "YES" | "NO"
): number {
  const liquidationBuffer = 100 / leverage;
  if (side === "YES") {
    return Math.max(0, entryProbability - liquidationBuffer);
  } else {
    return Math.min(100, entryProbability + liquidationBuffer);
  }
}

async function executeOrder(
  order: Order,
  executionSize: number,
  executionPrice: number
): Promise<Position | null> {
  try {
    const user = await storage.getUser(order.userId);
    if (!user) {
      console.log(`[orderEngine] User ${order.userId} not found, skipping order ${order.id}`);
      return null;
    }

    const leverage = order.leverage || 1;
    const margin = Math.ceil(executionSize / leverage);
    const currentBalance = parseFloat(user.balance || "0");

    if (currentBalance < margin) {
      console.log(`[orderEngine] Insufficient balance for order ${order.id}. Required: $${margin}, Available: $${currentBalance}`);
      await storage.updateOrder(order.id, { status: "cancelled" });
      return null;
    }

    const liquidationProbability = calculateLiquidationProbability(
      executionPrice,
      leverage,
      order.side as "YES" | "NO"
    );

    const position = await storage.createPosition({
      marketId: order.marketId,
      side: order.side as "YES" | "NO",
      size: executionSize,
      leverage,
      userId: order.userId,
      entryProbability: executionPrice.toFixed(8),
      liquidationProbability: liquidationProbability.toFixed(8),
    });

    await storage.createTrade({
      marketId: order.marketId,
      price: executionPrice.toFixed(8),
      size: executionSize,
      side: order.side as "YES" | "NO",
      userId: order.userId,
    });

    await storage.createOrderExecution({
      orderId: order.id,
      executionPrice: executionPrice.toFixed(4),
      executionSize: executionSize,
      positionId: position.id,
    });

    await storage.updateUserBalance(order.userId, -margin);

    const newFilledSize = order.filledSize + executionSize;
    const newRemainingSize = order.remainingSize - executionSize;
    const newStatus = newRemainingSize <= 0 ? "filled" : "partial";

    await storage.updateOrder(order.id, {
      filledSize: newFilledSize,
      remainingSize: Math.max(0, newRemainingSize),
      status: newStatus,
    });

    console.log(`[orderEngine] Executed order ${order.id}: ${executionSize} @ ${executionPrice.toFixed(2)}% (${order.orderType}, ${order.side})`);

    return position;
  } catch (error) {
    console.error(`[orderEngine] Error executing order ${order.id}:`, error);
    return null;
  }
}

async function processLimitOrders(): Promise<void> {
  const activeOrders = await storage.getActiveOrders();
  const limitOrders = activeOrders.filter(
    (o) => o.orderType === "limit" && o.remainingSize > 0
  );

  for (const order of limitOrders) {
    if (order.expiresAt && new Date(order.expiresAt) < new Date()) {
      await storage.updateOrder(order.id, { status: "expired" });
      console.log(`[orderEngine] Order ${order.id} expired`);
      continue;
    }

    const marketState = getMarketState(order.marketId);
    if (!marketState) continue;

    const currentPrice = marketState.currentProbability;
    const limitPrice = parseFloat(String(order.limitPrice || "0"));

    let shouldExecute = false;
    if (order.side === "YES") {
      shouldExecute = currentPrice <= limitPrice;
    } else {
      shouldExecute = currentPrice >= limitPrice;
    }

    if (shouldExecute) {
      await executeOrder(order, order.remainingSize, currentPrice);
    }
  }
}

async function processIcebergOrders(): Promise<void> {
  const activeOrders = await storage.getActiveOrders();
  const icebergOrders = activeOrders.filter(
    (o) => o.orderType === "iceberg" && o.remainingSize > 0
  );

  const now = new Date();
  const DEFAULT_ICEBERG_INTERVAL_MS = 30000; // 30 seconds between clips

  for (const order of icebergOrders) {
    if (order.expiresAt && new Date(order.expiresAt) < now) {
      await storage.updateOrder(order.id, { status: "expired" });
      console.log(`[orderEngine] Iceberg order ${order.id} expired`);
      continue;
    }

    // Use twapNextExecuteAt field for iceberg timing too
    const nextExecuteAt = order.twapNextExecuteAt ? new Date(order.twapNextExecuteAt) : now;
    if (nextExecuteAt > now) {
      continue; // Not time to execute yet
    }

    const marketState = getMarketState(order.marketId);
    if (!marketState) continue;

    const currentPrice = marketState.currentProbability;
    const limitPrice = parseFloat(String(order.limitPrice || "0"));

    // Check limit price - only execute at favorable prices
    let shouldExecute = false;
    if (limitPrice > 0) {
      if (order.side === "YES") {
        // For YES (buying), only execute if current price <= limit price
        shouldExecute = currentPrice <= limitPrice;
      } else {
        // For NO (selling), only execute if current price >= limit price
        shouldExecute = currentPrice >= limitPrice;
      }
    } else {
      // No limit price set - execute at any price (legacy behavior)
      shouldExecute = true;
    }

    if (!shouldExecute) {
      continue; // Price not favorable, wait
    }

    const visibleSize = order.visibleSize || Math.min(100, order.remainingSize);
    const clipSize = Math.min(visibleSize, order.remainingSize);

    if (clipSize > 0) {
      await executeOrder(order, clipSize, currentPrice);

      // Schedule next clip execution
      const updatedOrder = await storage.getOrder(order.id);
      if (updatedOrder && updatedOrder.remainingSize > 0 && updatedOrder.status !== "filled") {
        const intervalMs = order.twapIntervalMs || DEFAULT_ICEBERG_INTERVAL_MS;
        const nextExecute = new Date(now.getTime() + intervalMs);
        await storage.updateOrder(order.id, {
          twapNextExecuteAt: nextExecute,
        });
      }
    }
  }
}

async function processTwapOrders(): Promise<void> {
  const activeOrders = await storage.getActiveOrders();
  const twapOrders = activeOrders.filter(
    (o) => o.orderType === "twap" && o.remainingSize > 0
  );

  const now = new Date();

  for (const order of twapOrders) {
    if (order.expiresAt && new Date(order.expiresAt) < now) {
      await storage.updateOrder(order.id, { status: "expired" });
      console.log(`[orderEngine] TWAP order ${order.id} expired`);
      continue;
    }

    const nextExecuteAt = order.twapNextExecuteAt ? new Date(order.twapNextExecuteAt) : now;

    if (nextExecuteAt > now) {
      continue;
    }

    const marketState = getMarketState(order.marketId);
    if (!marketState) continue;

    const durationMs = order.twapDurationMs || 3600000;
    const intervalMs = order.twapIntervalMs || 60000;
    const numberOfSlices = Math.max(1, Math.floor(durationMs / intervalMs));
    const sliceSize = Math.max(1, Math.floor(order.totalSize / numberOfSlices));
    const executionSize = Math.min(sliceSize, order.remainingSize);

    const currentPrice = marketState.currentProbability;

    await executeOrder(order, executionSize, currentPrice);

    const updatedOrder = await storage.getOrder(order.id);
    if (updatedOrder && updatedOrder.remainingSize > 0 && updatedOrder.status !== "filled") {
      const nextExecute = new Date(now.getTime() + intervalMs);
      await storage.updateOrder(order.id, {
        twapNextExecuteAt: nextExecute,
      });
    }
  }
}

export async function tickOrderEngine(): Promise<void> {
  try {
    await Promise.all([
      processLimitOrders(),
      processIcebergOrders(),
      processTwapOrders(),
    ]);
  } catch (error) {
    console.error("[orderEngine] Error in tick:", error);
  }
}

export {
  processLimitOrders,
  processIcebergOrders,
  processTwapOrders,
  executeOrder,
  calculateLiquidationProbability,
};
