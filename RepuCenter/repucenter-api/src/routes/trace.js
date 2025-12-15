// src/routes/trace.js
const express = require('express');
const { query } = require('../db');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

/**
 * GET /trace/:sku
 * Línea de tiempo de movimientos por SKU (IN/OUT/ADJ), con stock acumulado.
 */
router.get('/:sku', authRequired, async (req, res) => {
  try {
    const { sku } = req.params;

    const sql = `
      SELECT 
        p.sku,
        p.name AS product_name,
        w.name AS warehouse,
        m.type_code,                                  -- <- aquí (IN/OUT/ADJ)
        CASE
        WHEN m.type_code = 'IN'  THEN ABS(m.qty)
        WHEN m.type_code = 'OUT' THEN -ABS(m.qty)
        WHEN m.type_code = 'ADJ' THEN m.qty
        END AS quantity_delta,
        m.reference,
        m.created_at,
        m.movement_id
      FROM product p
      JOIN movement  m ON m.product_id = p.product_id
      JOIN warehouse w ON w.warehouse_id = m.warehouse_id
      WHERE p.sku = $1
      ORDER BY m.created_at ASC, m.movement_id ASC
    `;

    const { rows } = await query(sql, [sku]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'SKU sin movimientos o inexistente' });
    }

    let acc = 0;
    const movements = rows.map(r => {
      acc += Number(r.quantity_delta || 0);
      return {
        sku: r.sku,
        product_name: r.product_name,
        warehouse: r.warehouse,
        movement_type: r.type_code,   // renombramos en la respuesta
        quantity_delta: Number(r.quantity_delta || 0),
        reference: r.reference,
        created_at: r.created_at,
        movement_id: r.movement_id,
        running_stock: acc
      };
    });

    res.json({
      sku: rows[0].sku,
      product: rows[0].product_name,
      movements,
      final_stock_by_trace: acc
    });
  } catch (err) {
    console.error('[TRACE ERROR]', err);
    res.status(500).json({ error: 'error interno en trazabilidad' });
  }
});

/**
 * GET /trace/:sku/stock
 * Devuelve stock por bodega y total de un SKU.
 */
router.get('/:sku/stock', authRequired, async (req, res) => {
  try {
    const { sku } = req.params;

    // Stock por bodega
    const sqlByWh = `
      SELECT 
        w.name AS warehouse,
        SUM(
          CASE 
            WHEN m.type_code = 'IN'  THEN ABS(m.qty)
            WHEN m.type_code = 'OUT' THEN -ABS(m.qty)
            WHEN m.type_code = 'ADJ' THEN m.qty
            ELSE 0
          END
        ) AS stock
      FROM product p
      JOIN movement  m ON m.product_id = p.product_id
      JOIN warehouse w ON w.warehouse_id = m.warehouse_id
      WHERE p.sku = $1
      GROUP BY w.name
      ORDER BY w.name;
    `;

    // Total
    const sqlTotal = `
      SELECT 
        SUM(
          CASE 
            WHEN m.type_code = 'IN'  THEN ABS(m.qty)
            WHEN m.type_code = 'OUT' THEN -ABS(m.qty)
            WHEN m.type_code = 'ADJ' THEN m.qty
            ELSE 0
          END
        ) AS total_stock
      FROM product p
      JOIN movement m ON m.product_id = p.product_id
      WHERE p.sku = $1;
    `;

    const [byWh, total] = await Promise.all([
      query(sqlByWh, [sku]),
      query(sqlTotal, [sku]),
    ]);

    res.json({
      sku,
      by_warehouse: byWh.rows.map(r => ({
        warehouse: r.warehouse,
        stock: Number(r.stock || 0)
      })),
      total_stock: Number(total.rows[0]?.total_stock || 0),
    });
  } catch (err) {
    console.error('[STOCK ERROR]', err);
    res.status(500).json({ error: 'error interno al calcular stock' });
  }
});

module.exports = router;