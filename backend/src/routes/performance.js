
import { Router } from 'express';
import { withTenantTransaction } from '../config/db.js';

const router = Router();

// N+1 Query Demonstration
router.get('/n-plus-one', async (req, res, next) => {
  try {
    const result = await withTenantTransaction(
      req.user.tenantId,
      async (db) => {
        const start = performance.now();

        const orders = await db.query(
          `SELECT id, status, total_amount, created_at
           FROM orders
           WHERE tenant_id = $1
           ORDER BY created_at DESC
           LIMIT 100`,
          [req.user.tenantId]
        );

        const output = [];

        for (const order of orders.rows) {
          const items = await db.query(
            `SELECT product_id, quantity, unit_price
             FROM order_items
             WHERE tenant_id = $1 AND order_id = $2`,
            [req.user.tenantId, order.id]
          );

          output.push({ ...order, items: items.rows });
        }

        return {
          orders: output,
          queryCount: 1 + orders.rows.length,
          executionTimeMs: Number((performance.now() - start).toFixed(2))
        };
      }
    );

    res.json({ method: 'N+1 Query', ...result });
  } catch (error) {
    next(error);
  }
});

// Optimized JOIN Demonstration
router.get('/optimized', async (req, res, next) => {
  try {
    const result = await withTenantTransaction(
      req.user.tenantId,
      async (db) => {
        const start = performance.now();

        const orders = await db.query(
          `SELECT
             o.id, o.status, o.total_amount, o.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'productId', oi.product_id,
                   'quantity', oi.quantity,
                   'unitPrice', oi.unit_price
                 )
               ) FILTER (WHERE oi.id IS NOT NULL),
               '[]'
             ) AS items
           FROM orders o
           LEFT JOIN order_items oi
             ON oi.tenant_id = o.tenant_id
             AND oi.order_id = o.id
           WHERE o.tenant_id = $1
           GROUP BY o.id
           ORDER BY o.created_at DESC
           LIMIT 100`,
          [req.user.tenantId]
        );

        return {
          orders: orders.rows,
          queryCount: 1,
          executionTimeMs: Number((performance.now() - start).toFixed(2))
        };
      }
    );

    res.json({ method: 'Optimized JOIN', ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
