// src/routes/movements.js
// -------------------------------------------------------------
// RUTA: /movements
// - Crea movimientos de inventario (IN / OUT / ADJ)
// - Restringido a rol JEFE_BODEGA
// - Devuelve stock por bodega y total tras el movimiento
// -------------------------------------------------------------

const express = require('express');
const { query } = require('../db');
const { authRequired } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roles');

const router = express.Router();

const VALID_TYPES = new Set(['IN', 'OUT', 'ADJ']);

/** ---- Helpers ---- */
function badRequest(res, msg) {
  return res.status(400).json({ error: msg });
}

function normalizeType(code) {
  return String(code || '').trim().toUpperCase();
}

function parseQty(q) {
  const n = Number(q);
  return Number.isNaN(n) ? null : n;
}

function normalizedQtyToStore(type, qtyNum) {
  // Persistencia:
  //  IN  => +|qty|
  //  OUT =>  |qty|  (el signo se aplica al calcular stock)
  //  ADJ =>  qty tal cual (+/-)
  if (type === 'IN' || type === 'OUT') return Math.abs(qtyNum);
  return qtyNum;
}

async function getProductIdBySku(sku) {
  const r = await query('SELECT product_id FROM product WHERE sku = $1', [sku]);
  return r.rowCount ? r.rows[0].product_id : null;
}

async function warehouseExists(warehouse_id) {
  const r = await query('SELECT 1 FROM warehouse WHERE warehouse_id = $1', [warehouse_id]);
  return r.rowCount > 0;
}

/**
 * Devuelve stock por bodega y total para un product_id.
 * Importante: el filtro por producto se aplica en el JOIN,
 * no en WHERE, para no romper el LEFT JOIN.
 */
async function computeStockByWarehouse(product_id) {
  const r = await query(
    `SELECT w.name AS warehouse,
            COALESCE(SUM(
              CASE
                WHEN m.type_code = 'IN'  THEN m.qty
                WHEN m.type_code = 'OUT' THEN -m.qty
                WHEN m.type_code = 'ADJ' THEN m.qty
                ELSE 0
              END
            ), 0) AS stock
     FROM warehouse w
     LEFT JOIN movement m
       ON m.warehouse_id = w.warehouse_id
      AND m.product_id  = $1
     GROUP BY w.name
     ORDER BY w.name`,
    [product_id]
  );

  const byWarehouse = r.rows.map(row => ({
    warehouse: row.warehouse,
    stock: Number(row.stock)
  }));

  const total = byWarehouse.reduce((acc, it) => acc + it.stock, 0);
  return { byWarehouse, total };
}

/** ---- Route ---- */
router.post(
  '/',
  authRequired,
  requireRole('JEFE_BODEGA'),
  async (req, res) => {
    try {
      // -------- 1) Validaciones de entrada --------
      const { sku, warehouse_id, type_code, qty, reference, notes } = req.body || {};

      if (!sku || !warehouse_id || type_code === undefined || qty === undefined) {
        return badRequest(res, 'Faltan datos obligatorios (sku, warehouse_id, type_code, qty)');
      }

      const t = normalizeType(type_code);
      if (!VALID_TYPES.has(t)) {
        return badRequest(res, 'type_code inválido (use IN, OUT o ADJ)');
      }

      const qtyNum = parseQty(qty);
      if (qtyNum === null) return badRequest(res, 'qty debe ser numérico');
      if (t !== 'ADJ' && qtyNum <= 0) return badRequest(res, 'qty debe ser > 0 para IN/OUT');
      if (t === 'ADJ' && qtyNum === 0) return badRequest(res, 'qty no puede ser 0 para ADJ');

      // -------- 2) Resolver claves foráneas en paralelo --------
      const [product_id, wExists] = await Promise.all([
        getProductIdBySku(sku),
        warehouseExists(warehouse_id)
      ]);

      if (!product_id) return res.status(404).json({ error: 'SKU no existe' });
      if (!wExists) return res.status(404).json({ error: 'Bodega no existe' });

      // -------- 3) Normalizar cantidad a persistir --------
      const qtyToStore = normalizedQtyToStore(t, qtyNum);

      // -------- 4) Insertar movimiento --------
      const ins = await query(
        `INSERT INTO movement (product_id, warehouse_id, type_code, qty, reference, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING movement_id, created_at`,
        [
          product_id,
          warehouse_id,
          t,
          qtyToStore,
          reference || null,
          notes || null,
          req.user.sub // del JWT
        ]
      );

      // -------- 5) Recalcular stock --------
      const { byWarehouse, total } = await computeStockByWarehouse(product_id);

      // qty lógico expuesto al cliente:
      const qtyExposed = t === 'OUT' ? -Math.abs(qtyNum) : (t === 'IN' ? Math.abs(qtyNum) : qtyNum);

      // -------- 6) Respuesta --------
      return res.json({
        sku,
        warehouse_id,
        type_code: t,
        qty: qtyExposed,
        unit_cost: null,
        reference: reference || null,
        notes: notes || null,
        movement_id: String(ins.rows[0].movement_id),
        created_at: ins.rows[0].created_at,
        stock_by_warehouse: byWarehouse,
        total_stock: total
      });

    } catch (err) {
      console.error('[POST /movements ERROR]', {
        message: err.message,
        code: err.code,
        detail: err.detail,
        constraint: err.constraint,
        stack: err.stack
      });
      return res.status(500).json({ error: 'error interno al crear movimiento' });
    }
  }
);

module.exports = router;