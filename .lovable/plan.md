
# Build Plan — Manufacturing, Multi-Warehouse, Salesman Stock

Three modules built together, sharing one new "stock ledger" foundation so existing Sales/Purchase/Inventory keep working.

---

## 1. Database (single migration)

### Multi-warehouse
- `warehouses` — name, code, address, type (warehouse / van / production), is_default, status
- `warehouse_stock` — (product_id, warehouse_id) → quantity, min_level. Unique pair.
- `user_warehouse_access` — user_id, warehouse_id, can_view/can_modify (for per-warehouse permissions; superadmin & admin bypass)
- `stock_transfers` + `stock_transfer_items` — from_warehouse → to_warehouse, status (draft/in_transit/completed)
- Add `warehouse_id` (nullable) to: `sales_invoices`, `purchase_bills`, `sale_returns`, `purchase_returns`, `stock_transactions`

### Manufacturing (MFD)
- `bom` — finished `product_id`, name, output_quantity, labor_cost, overhead_cost, version, is_active
- `bom_items` — bom_id, raw `product_id`, quantity, unit_cost (snapshot)
- `production_orders` — order_number, bom_id, planned_qty, actual_qty, scrap_qty, warehouse_id (consumes raw from / outputs to), status (draft/in_progress/completed/cancelled), start_date, completion_date, total_material_cost, total_labor_cost, total_overhead_cost, cost_per_unit, batch_number, mfg_date, expiry_date, notes
- `production_order_consumption` — order_id, raw product_id, planned_qty, actual_qty, unit_cost, total_cost (auto-fills from BOM, editable)
- `product_batches` — product_id, batch_number, mfg_date, expiry_date, quantity, warehouse_id, production_order_id, status

### Salesman stock (van stock)
- Each salesman gets a "van" warehouse auto-created (type='van', linked via `employee_id`)
- `salesman_stock_issues` + `_items` — issue stock from warehouse → salesman van. status (draft/issued/returned/reconciled)
- `salesman_stock_returns` + `_items` — end-of-day return van → warehouse, with reconciliation (issued − sold − returned = variance)
- Salesman invoices: `sales_invoices.warehouse_id` points to their van warehouse → stock auto-deducts from van

### Triggers
- Replace existing `sync_stock_on_sales_invoice_item` with warehouse-aware version: deduct from `warehouse_stock` of the invoice's warehouse (default warehouse if null), keep `products.stock_quantity` as the SUM across warehouses.
- New trigger on `purchase_bill_items` → adds to warehouse_stock
- New trigger on `stock_transfer_items` (on completion) → deduct from source, add to dest
- New trigger on `production_orders` (on completion) → deduct raw from warehouse_stock, add finished + create batch
- New trigger on `salesman_stock_issues/_returns` → move stock between main warehouse ↔ van warehouse
- All triggers also write to `stock_transactions` for audit

### RLS
- Warehouses/BOM/Production: authenticated can view; modify gated by `is_admin` OR `user_warehouse_access.can_modify`
- Salesman stock issues: salesman sees their own; admins see all
- Superadmin bypasses everything (already in `is_admin`)

---

## 2. Frontend

### New pages (added to sidebar + App.tsx routes)
- `/warehouses` — list/CRUD warehouses, manage user access
- `/stock-transfers` — list + new transfer form
- `/manufacturing/bom` — BOM list + form (add raw materials with auto-cost)
- `/manufacturing/production` — production orders list + form (live cost calculator: material+labor+overhead → per-unit cost), batch & expiry inputs
- `/manufacturing/batches` — batch & expiry tracker with near-expiry alerts
- `/salesman/issue-stock` — admin issues stock to salesman
- `/salesman/my-stock` — salesman sees their van stock
- `/salesman/return-reconcile` — end-of-day return + reconciliation report

### Updates to existing
- **Inventory page**: warehouse selector tab; show stock per warehouse
- **InvoiceForm / PurchaseBillForm**: warehouse selector (defaults to user's primary warehouse / van for salesmen)
- **Sidebar (ErpSidebar)**: new "Manufacturing", "Warehouses", "Salesman Stock" sections
- **Products page**: show per-warehouse breakdown in detail view

### Sidebar grouping
```text
Inventory
├── Products
├── Warehouses          (new)
├── Stock Transfers     (new)
└── Stock Records
Manufacturing           (new)
├── Bill of Materials
├── Production Orders
└── Batches & Expiry
Salesman                (new)
├── Issue Stock
├── My Van Stock
└── Return & Reconcile
```

---

## 3. Technical details

- All new tables have `created_at`, `updated_at`, `created_by`, RLS enabled.
- Cost calculation (live in UI + recomputed in trigger):
  `cost_per_unit = (Σ(raw_qty × raw_unit_cost) + labor_cost + overhead_cost) / actual_qty`
- Yield % = `actual_qty / planned_qty × 100`; scrap auto = `planned − actual`.
- Stock numbers everywhere read from `warehouse_stock` aggregated; legacy `products.stock_quantity` kept in sync via trigger.
- Existing data: backfill — create one default warehouse "Main Warehouse", move all current `products.stock_quantity` into `warehouse_stock` for it, and tag existing invoices/bills with this warehouse_id.

---

## 4. Rollout order within the single migration

1. Create warehouses + backfill default + per-product warehouse_stock from existing stock.
2. Add warehouse_id columns + backfill to default warehouse.
3. Replace stock-sync triggers (warehouse-aware).
4. Create transfers, BOM, production, batches, salesman tables + triggers.
5. RLS policies for all new tables.

Then frontend in one pass: shared hooks (`useWarehouses`, `useWarehouseStock`), then pages, then sidebar wiring, then form updates.

---

This is a big migration touching stock everywhere. Approve and I'll start with the SQL migration (you'll get the standard approval prompt), then build the UI in the same response.
