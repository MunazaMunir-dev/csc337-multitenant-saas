-- Run in pgAdmin to view demo product UUIDs.
-- Tenant A
SELECT t.name AS tenant, p.id AS product_uuid, p.name, p.sku, p.inventory_quantity
FROM products p JOIN tenants t ON t.id = p.tenant_id
WHERE t.slug = 'abc-electronics';

-- Tenant B
SELECT t.name AS tenant, p.id AS product_uuid, p.name, p.sku, p.inventory_quantity
FROM products p JOIN tenants t ON t.id = p.tenant_id
WHERE t.slug = 'xyz-fashion';

-- Verify orders are tenant-scoped.
SELECT t.slug, o.id, o.status, o.total_amount, o.created_at
FROM orders o JOIN tenants t ON t.id = o.tenant_id
ORDER BY o.created_at DESC;
