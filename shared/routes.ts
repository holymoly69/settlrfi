import { z } from 'zod';
import { insertMarketSchema, insertPositionSchema, markets, positions, trades } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  markets: {
    list: {
      method: 'GET' as const,
      path: '/api/markets',
      input: z.object({
        category: z.string().optional(),
        status: z.enum(["active", "resolved", "canceled"]).optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof markets.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/markets/:id',
      responses: {
        200: z.custom<typeof markets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    trades: {
      method: 'GET' as const,
      path: '/api/markets/:id/trades',
      responses: {
        200: z.array(z.custom<typeof trades.$inferSelect>()),
      },
    }
  },
  positions: {
    list: {
      method: 'GET' as const,
      path: '/api/positions',
      responses: {
        200: z.array(z.custom<typeof positions.$inferSelect & { market: typeof markets.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/positions',
      input: insertPositionSchema,
      responses: {
        201: z.custom<typeof positions.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound, // Market not found
      },
    },
    close: {
      method: 'POST' as const,
      path: '/api/positions/:id/close',
      responses: {
        200: z.custom<typeof positions.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    partialClose: {
      method: 'POST' as const,
      path: '/api/positions/:id/partial-close',
      input: z.object({
        percent: z.number().min(1).max(100),
      }),
      responses: {
        200: z.object({
          closedPosition: z.custom<typeof positions.$inferSelect>(),
          remainingPosition: z.custom<typeof positions.$inferSelect>().nullable(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    byMarket: {
      method: 'GET' as const,
      path: '/api/positions/market/:marketId',
      responses: {
        200: z.array(z.custom<typeof positions.$inferSelect & { market: typeof markets.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    }
  },
  portfolio: {
    summary: {
      method: 'GET' as const,
      path: '/api/portfolio/summary',
      responses: {
        200: z.object({
          totalInvested: z.number(),
          totalPnl: z.number(),
          activePositions: z.number(),
        }),
        401: errorSchemas.unauthorized,
      },
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type MarketListResponse = z.infer<typeof api.markets.list.responses[200]>;
export type PositionListResponse = z.infer<typeof api.positions.list.responses[200]>;
export type CreatePositionInput = z.infer<typeof api.positions.create.input>;
