
-- Performance Testing: After Optimization

-- Create composite index for tenant orders
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created
ON orders (tenant_id, created_at DESC);

-- Optimized orders query
EXPLAIN ANALYZE
SELECT *
FROM orders
WHERE tenant_id = '351d1b31-27e0-4e8b-aa4f-27fd08c9c4d2'
ORDER BY created_at DESC;

-- Optimized products query
EXPLAIN ANALYZE
SELECT *
FROM products
WHERE tenant_id = '351d1b31-27e0-4e8b-aa4f-27fd08c9c4d2';
