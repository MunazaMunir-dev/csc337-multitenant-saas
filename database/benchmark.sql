
-- Database Performance Benchmark

-- 1. Check total orders
SELECT COUNT(*) AS total_orders
FROM orders;

-- 2. Check orders tenant-wise
SELECT
    tenant_id,
    COUNT(*) AS total_orders
FROM orders
GROUP BY tenant_id;

-- 3. Check index information
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'orders';

-- 4. Measure optimized query execution
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM orders
WHERE tenant_id = '351d1b31-27e0-4e8b-aa4f-27fd08c9c4d2'
ORDER BY created_at DESC;
