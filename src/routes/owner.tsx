import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RoleHeader } from "@/components/role-header";
import { PRODUCTS, ORDERS, DRIVERS, type Order } from "@/lib/los-nietos-data";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "Dueño · Los Nietos" },
      { name: "description", content: "Dashboard de ventas, alertas e IA para el dueño." },
    ],
  }),
  component: OwnerPage,
});

const HOURLY = [12, 28, 22, 35, 48, 55, 40, 30]; // 8am..10pm (every 2h)
const HOURS = ["8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];

function OwnerPage() {
  const [aiOpen, setAiOpen] = useState(false);

  const metrics = useMemo(() => {
    const sales = PRODUCTS.reduce((s, p) => s + p.price * p.sales, 0);
    const margin = PRODUCTS.reduce((s, p) => s + (p.price - p.cost) * p.sales, 0);
    return {
      sales,
      orders: 47,
      customers: 23,
      margin,
    };
  }, []);

  const top = useMemo(
    () =>
      [...PRODUCTS]
        .map((p) => ({ ...p, mar: (p.price - p.cost) * p.sales }))
        .sort((a, b) => b.mar - a.mar)
        .slice(0, 5),
    [],
  );

  const maxBar = Math.max(...HOURLY);

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader title="📊 Dashboard" />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Ventas" value={`$${metrics.sales.toLocaleString()}`} delta="+12%" color="var(--brand-blue)" />
          <MetricCard label="Pedidos" value={metrics.orders} delta="+8%" color="var(--brand-red)" />
          <MetricCard label="Clientes" value={metrics.customers} delta="+5%" color="var(--brand-orange)" />
          <MetricCard label="Margen" value={`$${metrics.margin.toLocaleString()}`} delta="+15%" color="var(--brand-green)" />
        </section>

        {/* Critical alert */}
        <section
          className="rounded-xl p-4 text-sm font-medium"
          style={{
            background: "var(--soft-red)",
            borderLeft: "4px solid var(--brand-red)",
            color: "oklch(0.45 0.18 25)",
          }}
        >
          <strong>⚠ Alerta:</strong> Corona: Stock bajo (3 cajas) · Coca: Precio sube · Compra HOY
        </section>

        {/* Sales chart */}
        <section className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg">Ventas por hora</h2>
            <span className="text-xs text-muted-foreground">Hoy</span>
          </div>
          <div className="flex items-end gap-2 h-44">
            {HOURLY.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full rounded-t-md bg-gradient-chart transition-all group-hover:opacity-80"
                  style={{ height: `${(v / maxBar) * 100}%` }}
                  title={`$${v * 100}`}
                />
                <span className="text-[10px] text-muted-foreground">{HOURS[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top 5 + AI button */}
        <section className="grid md:grid-cols-2 gap-5">
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <h2 className="font-display text-lg mb-3">Top 5 productos</h2>
            <ul className="divide-y divide-border">
              {top.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--brand-green)" }}>
                    ${p.mar.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card rounded-2xl p-5 shadow-card flex flex-col">
            <h2 className="font-display text-lg mb-2">Análisis IA</h2>
            <p className="text-sm text-muted-foreground flex-1">
              Recomendaciones de precio, stock y combos basadas en tus ventas.
            </p>
            <button
              onClick={() => setAiOpen(true)}
              className="mt-4 rounded-xl py-3 font-semibold text-white bg-gradient-hero hover:opacity-90 transition-opacity"
            >
              ⚡ Ejecutar análisis IA
            </button>
          </div>
        </section>

        {/* Deliveries / Drivers */}
        <DeliveriesSection />
      </main>

      {aiOpen && <AiModal onClose={() => setAiOpen(false)} />}
    </div>
  );
}

function DeliveriesSection() {
  const [tab, setTab] = useState<"pendientes" | "entregadas">("pendientes");
  const [driverFilter, setDriverFilter] = useState<string>("todos");

  const filtered = useMemo(() => {
    return ORDERS.filter((o) => {
      const matchStatus =
        tab === "pendientes" ? o.status !== "entregada" : o.status === "entregada";
      const matchDriver = driverFilter === "todos" || o.driverCode === driverFilter;
      return matchStatus && matchDriver;
    });
  }, [tab, driverFilter]);

  const pendCount = ORDERS.filter((o) => o.status !== "entregada").length;
  const entCount = ORDERS.filter((o) => o.status === "entregada").length;

  return (
    <section className="bg-card rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-lg">🏍️ Entregas y repartidores</h2>
        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 font-medium"
        >
          <option value="todos">Todos los repartidores</option>
          {DRIVERS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} · {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Driver workload */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {DRIVERS.map((d) => {
          const count = ORDERS.filter(
            (o) => o.driverCode === d.code && o.status !== "entregada",
          ).length;
          return (
            <button
              key={d.code}
              onClick={() => setDriverFilter(d.code)}
              className={`rounded-xl p-2 text-left border-2 transition-colors ${
                driverFilter === d.code ? "border-primary bg-accent" : "border-transparent bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                  style={{ background: "var(--brand-blue)" }}
                >
                  {d.code}
                </span>
                <span className="font-display text-base">{count}</span>
              </div>
              <div className="text-[11px] font-semibold truncate mt-1">{d.name}</div>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-muted rounded-xl p-1 mb-3">
        {(["pendientes", "entregadas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t} ({t === "pendientes" ? pendCount : entCount})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-6">
          Sin pedidos para mostrar.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const driver = DRIVERS.find((d) => d.code === order.driverCode);
  const statusMap: Record<Order["status"], { label: string; color: string }> = {
    pendiente: { label: "Pendiente", color: "var(--brand-orange)" },
    "en-camino": { label: "En camino", color: "var(--brand-blue)" },
    entregada: { label: "Entregada", color: "var(--brand-green)" },
  };
  const s = statusMap[order.status];

  return (
    <li className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 text-left hover:bg-accent transition-colors"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
              style={{ background: "var(--brand-blue)" }}
            >
              {order.driverCode}
            </span>
            <span className="font-semibold text-sm">
              {order.id} · {order.customer}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">${order.total}</span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ background: s.color }}
            >
              {s.label}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1 truncate">
          📍 {order.address} · {order.payment} {order.paid ? "· PAGADO" : "· COBRAR"}
        </div>
      </button>

      {open && (
        <div className="p-4 bg-muted/50 border-t border-border space-y-3 text-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">CLIENTE</div>
              <div>{order.customer}</div>
              <a href={`tel:${order.phone}`} className="text-primary underline text-xs">
                📞 {order.phone}
              </a>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">REPARTIDOR</div>
              <div>
                {driver?.name} ({order.driverCode})
              </div>
              <div className="text-xs text-muted-foreground">{driver?.phone}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold text-muted-foreground">DIRECCIÓN</div>
              <div>{order.address}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">FORMA DE PAGO</div>
              <div className="font-semibold">
                {order.payment}{" "}
                <span
                  className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{
                    background: order.paid ? "var(--brand-green)" : "var(--brand-orange)",
                  }}
                >
                  {order.paid ? "PAGADO" : `COBRAR $${order.total}`}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">ETA</div>
              <div>{order.eta} min</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold text-muted-foreground">INDICACIONES</div>
              <div className="bg-card rounded-lg p-2 mt-1">{order.notes}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">PRODUCTOS</div>
              <ul className="divide-y divide-border border border-border rounded-lg bg-card">
                {order.items.map((it, i) => (
                  <li key={i} className="flex justify-between px-3 py-1.5 text-xs">
                    <span>
                      {it.qty}× {it.name}
                    </span>
                    <span className="font-semibold">${it.qty * it.price}</span>
                  </li>
                ))}
                <li className="flex justify-between px-3 py-1.5 text-xs font-bold bg-muted">
                  <span>TOTAL</span>
                  <span>${order.total}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function MetricCard({
  label,
  value,
  delta,
  color,
}: {
  label: string;
  value: string | number;
  delta: string;
  color: string;
}) {
  return (
    <div
      className="bg-card rounded-2xl p-4 shadow-card"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
      <div className="text-xs font-semibold mt-1" style={{ color: "var(--brand-green)" }}>
        {delta} vs ayer
      </div>
    </div>
  );
}

function AiModal({ onClose }: { onClose: () => void }) {
  const recs = [
    { icon: "📈", title: "Precio", body: "Corona en pico: sube 8-10%", tone: "var(--brand-green)" },
    { icon: "⚠️", title: "Stock", body: "Corona crítico: compra HOY", tone: "var(--brand-red)" },
    { icon: "🎯", title: "Combo", body: "Cerveza + Botana + Hielo = mayor margen", tone: "var(--brand-purple)" },
  ];
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-md p-6 animate-modal"
        style={{ borderTop: "4px solid var(--brand-blue)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl mb-4">⚡ Análisis IA</h3>
        <div className="space-y-3">
          {recs.map((r) => (
            <div
              key={r.title}
              className="rounded-xl p-3 flex gap-3 items-start"
              style={{ background: "var(--muted)", borderLeft: `4px solid ${r.tone}` }}
            >
              <div className="text-2xl">{r.icon}</div>
              <div>
                <div className="font-semibold text-sm">{r.title}</div>
                <div className="text-sm text-muted-foreground">{r.body}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl py-3 font-semibold text-white bg-gradient-hero"
        >
          OK
        </button>
      </div>
    </div>
  );
}
