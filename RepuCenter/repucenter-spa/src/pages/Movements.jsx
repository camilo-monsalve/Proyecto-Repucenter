// src/pages/Movements.jsx
import { useMemo, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const api = axios.create({ baseURL: API });

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Bodegas fijas (no dependemos del endpoint /warehouses) ---
const fixedWarehouses = [
  { warehouse_id: 1, name: "Bodega Central" },
  { warehouse_id: 2, name: "Bodega de Tránsito" },
];

export default function Movements() {
  // Form state
  const [sku, setSku] = useState("REP-1001");
  const [warehouseId, setWarehouseId] = useState(fixedWarehouses[0].warehouse_id); // Central por defecto
  const [typeCode, setTypeCode] = useState("IN");
  const [qty, setQty] = useState(1);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text:string}
  const [serverData, setServerData] = useState(null);

  // Validaciones cliente
  const parsedQty = useMemo(() => Number(qty), [qty]);
  const qtyIsNumber = !Number.isNaN(parsedQty);

  const qtyRuleOk = useMemo(() => {
    if (!qtyIsNumber) return false;
    if (typeCode === "ADJ") return parsedQty !== 0;
    return parsedQty > 0; // IN/OUT > 0
  }, [typeCode, parsedQty, qtyIsNumber]);

  const formOk = useMemo(() => {
    return (
      sku.trim().length > 0 &&
      String(warehouseId).trim() !== "" &&
      ["IN", "OUT", "ADJ"].includes(typeCode) &&
      qtyRuleOk
    );
  }, [sku, warehouseId, typeCode, qtyRuleOk]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setServerData(null);

    if (!formOk) {
      setMsg({ type: "err", text: "Faltan datos obligatorios (sku, warehouse_id, type_code, qty)" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        sku: sku.trim(),
        warehouse_id: Number(warehouseId),
        type_code: typeCode,
        qty: Number(parsedQty),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await api.post("/movements", payload, { headers: authHeaders() });
      setMsg({ type: "ok", text: "Movimiento registrado." });
      setServerData(res.data);

      // Reset rápido
      setQty(1);
      setReference("");
      setNotes("");
    } catch (err) {
      const text =
        err?.response?.data?.error ||
        err?.message ||
        "Error al registrar movimiento.";
      setMsg({ type: "err", text });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rc-container py-6">
      <div className="rc-card">
        <h2 className="text-lg font-semibold mb-4">Registrar movimiento</h2>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-1">
            <label className="rc-label" htmlFor="sku">SKU</label>
            <input
              id="sku"
              className="rc-input"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="rc-label" htmlFor="warehouse">Bodega</label>
            <select
              id="warehouse"
              className="rc-select"
              value={warehouseId}
              onChange={(e) => setWarehouseId(Number(e.target.value))}
              required
            >
              {fixedWarehouses.map((w) => (
                <option key={w.warehouse_id} value={w.warehouse_id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1">
            <label className="rc-label" htmlFor="type">Tipo</label>
            <select
              id="type"
              className="rc-select"
              value={typeCode}
              onChange={(e) => setTypeCode(e.target.value)}
            >
              <option value="IN">IN (Entrada)</option>
              <option value="OUT">OUT (Salida)</option>
              <option value="ADJ">ADJ (Ajuste)</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <label className="rc-label" htmlFor="qty">Cantidad</label>
            <input
              id="qty"
              className="rc-input"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              inputMode="numeric"
              step="1"
            />
            <p className="text-xs mt-1 text-slate-500">
              IN suma, OUT resta, ADJ aplica el signo ingresado (≠ 0).
            </p>
            {!qtyIsNumber && (
              <p className="text-xs mt-1 text-red-600">La cantidad debe ser numérica.</p>
            )}
            {qtyIsNumber && !qtyRuleOk && (
              <p className="text-xs mt-1 text-red-600">
                {typeCode === "ADJ" ? "En ADJ la cantidad no puede ser 0." : "En IN/OUT la cantidad debe ser > 0."}
              </p>
            )}
          </div>

          <div className="sm:col-span-1">
            <label className="rc-label" htmlFor="reference">Referencia</label>
            <input
              id="reference"
              className="rc-input"
              placeholder="OC-123, DESP-001, AJ-01…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="rc-label" htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              className="rc-textarea"
              placeholder="Comentario opcional…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              className="rc-btn"
              type="submit"
              disabled={!formOk || submitting}
              aria-busy={submitting ? "true" : "false"}
            >
              {submitting ? "Guardando…" : "Guardar"}
            </button>
            {msg && (
              <span
                className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}
                role={msg.type === "err" ? "alert" : "status"}
              >
                {msg.text}
              </span>
            )}
          </div>
        </form>

        {serverData && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Resultado</h3>
            <div className="text-sm">
              <p>
                <strong>Movimiento:</strong> #{serverData.movement_id} ·{" "}
                {new Date(serverData.created_at).toLocaleString()}
              </p>
              <p>
                <strong>SKU:</strong> {serverData.sku} · <strong>Tipo:</strong> {serverData.type_code} ·{" "}
                <strong>Cantidad:</strong> {serverData.qty}
              </p>
              <p><strong>Stock total:</strong> {serverData.total_stock}</p>
              {Array.isArray(serverData.stock_by_warehouse) && serverData.stock_by_warehouse.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {serverData.stock_by_warehouse.map((s) => (
                    <li key={s.warehouse}>
                      {s.warehouse}: <strong>{s.stock}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}