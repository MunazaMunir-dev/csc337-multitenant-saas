import { Router } from 'express';
import { z } from 'zod';
import { withTenantTransaction } from '../config/db.js';
import { publishOrderCreated } from '../services/orderProducer.js';

const router = Router();
const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1000)
  })).min(1)
});

router.get('/', async (req, res, next) => {
  try {
    const orders = await withTenantTransaction(req.user.tenantId, async (db) => {
      const result = await db.query(
        `SELECT o.id, o.status, o.total_amount, o.created_at,
                COALESCE(json_agg(json_build_object(
                  'productId', oi.product_id, 'productName', p.name,
                  'quantity', oi.quantity, 'unitPrice', oi.unit_price
                )) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
         FROM orders o
         LEFT JOIN order_items oi
           ON oi.tenant_id = o.tenant_id AND oi.order_id = o.id
         LEFT JOIN products p
           ON p.tenant_id = oi.tenant_id AND p.id = oi.product_id
         WHERE o.tenant_id = $1
         GROUP BY o.id
         ORDER BY o.created_at DESC LIMIT 100`,
        [req.user.tenantId]
      );
      return result.rows;
    });
    res.json({ orders });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid order', details: parsed.error.flatten() });

    const tenantId = req.user.tenantId;
    const order = await withTenantTransaction(tenantId, async (db) => {
      let total = 0;
      const lineItems = [];
      for (const item of parsed.data.items) {
        const product = await db.query(
          `SELECT id, name, unit_price, inventory_quantity
           FROM products WHERE tenant_id = $1 AND id = $2`,
          [tenantId, item.productId]
        );
        if (!product.rowCount) {
          const error = new Error('Product not found in your tenant');
          error.status = 404;
          throw error;
        }
        const p = product.rows[0];
        if (p.inventory_quantity < item.quantity) {
          const error = new Error(`Insufficient inventory for ${p.name}`);
          error.status = 409;
          throw error;
        }
        total += Number(p.unit_price) * item.quantity;
        lineItems.push({ productId: p.id, quantity: item.quantity, unitPrice: Number(p.unit_price) });
      }
      const inserted = await db.query(
        `INSERT INTO orders (tenant_id, user_id, total_amount)
         VALUES ($1, $2, $3) RETURNING id, status, total_amount, created_at`,
        [tenantId, req.user.id, total]
      );
      for (const item of lineItems) {
        await db.query(
          `INSERT INTO order_items (tenant_id, order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, inserted.rows[0].id, item.productId, item.quantity, item.unitPrice]
        );
      }
      return { ...inserted.rows[0], items: lineItems };
    });

    const event = {
      eventId: crypto.randomUUID(),
      eventType: 'OrderCreated',
      tenantId,
      orderId: order.id,
      items: order.items,
      occurredAt: new Date().toISOString()
    };
    // Publish before acknowledging. If Kafka is unavailable, return an error rather
    // than claiming the asynchronous event was accepted.
    await publishOrderCreated(event);
    res.status(202).json({ message: 'Order accepted for asynchronous processing', order, eventId: event.eventId });
  } catch (error) { next(error); }
});
export default router;
