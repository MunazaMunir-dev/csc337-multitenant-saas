
-- Performance Testing: Before Optimization

-- 1. Check orders for a tenant
EXPLAIN ANALYZE
SELECT *
FROM orders
WHERE tenant_id = '351d1b31-27e0-4e8b-aa4f-27fd08c9c4d2'
ORDER BY created_at DESC;

-- 2. Check products for a tenant
EXPLAIN ANALYZE
SELECT *
FROM products
WHERE tenant_id = '351d1b31-27e0-4e8b-aa4f-27fd08c9c4d2';
