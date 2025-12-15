import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function Trace() {
  const { sku } = useParams();
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const token = localStorage.getItem("token");

  const [data, setData] = useState(null);
  const [stockByWh, setStockByWh] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [traceRes, stockRes] = await Promise.all([
          axios.get(`${API}/trace/${sku}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/trace/${sku}/stock`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setData(traceRes.data);
        setStockByWh(stockRes.data.by_warehouse || []);
      } catch (_) {}
    };
    load();
  }, [sku]);

  if (!data) return null;

  return (
    <div className="rc-container py-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Trazabilidad</h2>
        <div className="mt-2 text-sm">
          <div><b>SKU:</b> {data.sku} &nbsp; <b>Producto:</b> {data.product}</div>
          <div className="mt-1">
            <b>Stock total:</b> {data.final_stock_by_trace} &nbsp; 
            {stockByWh.map((w, i) => (
              <span key={i} className="ml-2">{w.warehouse}: <b>{w.stock}</b></span>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow">
        <table className="rc-table">
          <thead className="bg-black text-white">
            <tr>
              <th className="rc-th">#</th>
              <th className="rc-th">Fecha</th>
              <th className="rc-th">Bodega</th>
              <th className="rc-th">Tipo</th>
              <th className="rc-th text-right">Cantidad (±)</th>
              <th className="rc-th">Ref</th>
              <th className="rc-th text-right">Stock Acum.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.movements.map((m, idx) => (
              <tr key={m.movement_id} className="hover:bg-slate-50">
                <td className="rc-td">{idx + 1}</td>
                <td className="rc-td">{new Date(m.created_at).toLocaleString()}</td>
                <td className="rc-td">{m.warehouse}</td>
                <td className="rc-td">{m.movement_type}</td>
                <td className={`rc-td text-right ${m.quantity_delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {m.quantity_delta}
                </td>
                <td className="rc-td">{m.reference || "-"}</td>
                <td className="rc-td text-right">{m.running_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}