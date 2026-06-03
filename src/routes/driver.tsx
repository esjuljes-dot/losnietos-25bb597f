import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RoleHeader } from "@/components/role-header";
import { ORDERS, type Order } from "@/lib/los-nietos-data";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Repartidor · Los Nietos" },
      { name: "description", content: "Entregas activas, rutas y ganancias del día." },
    ],
  }),
  component: DriverPage,
});

function DriverPage() {
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [toast, setToast] = useState<string | null>(null);

  const active = orders.find((o) => o.status !== "entregada") ?? orders[0];

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const markDelivered = () => {
    setOrders((os) =>
      os.map((o) => (o.id === active.id ? { ...o, status: "entregada", progress: 100 } : o)),
    );
    showToast("✓ Entrega completada");
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <RoleHeader title="🏍️ Entregas" />

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Active delivery */}
        <section className="rounded-2xl p-5 text-white shadow-card bg-gradient-green">
          <div className="text-xs font-bold tracking-wide opacity-90">ENTREGA ACTIVA</div>
          <div className="font-display text-2xl mt-1">{active.customer}</div>
          <div className="text-sm opacity-95">
            ETA: {active.eta} min · ${active.total}
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="opacity-90">Progreso</span>
              <span className="font-semibold">{active.progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${active.progress}%` }}
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-card rounded-2xl p-5 shadow-card">
          <div className="text-sm font-semibold mb-1">📍 Dirección</div>
          <div className="text-sm">Calle Nicolás Bravo #940, Tecomán</div>
          <div className="text-xs text-muted-foreground mt-1">1.2 km · 15 min</div>
          <a
            href="https://maps.google.com/?q=Tecoman+Colima"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-xl px-4 py-2.5 font-semibold text-white text-sm"
            style={{ background: "var(--brand-blue)" }}
          >
            📍 Abrir Maps
          </a>
        </section>

        {/* Action */}
        <button
          onClick={markDelivered}
          disabled={active.status === "entregada"}
          className="w-full rounded-2xl py-4 font-bold text-white bg-gradient-green shadow-card disabled:opacity-50"
        >
          {active.status === "entregada" ? "✓ ENTREGADA" : "✓ MARCAR ENTREGADA"}
        </button>

        {/* Earnings */}
        <section className="rounded-2xl p-5 text-white shadow-card bg-gradient-orange">
          <div className="text-sm font-semibold opacity-95">💰 Ganancias hoy</div>
          <div className="font-display text-4xl mt-1">$420</div>
          <div className="text-sm opacity-95">8 entregas completadas</div>
        </section>

        {/* Order queue */}
        <section className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="font-display text-lg mb-3">Cola de pedidos</h3>
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  <span className="font-semibold">{o.id}</span>{" "}
                  <span className="text-muted-foreground">· {o.customer}</span>
                </span>
                <StatusPill status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      </main>

      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-white text-sm font-semibold shadow-lift animate-toast"
          style={{ background: "var(--brand-green)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { label: string; color: string }> = {
    pendiente: { label: "Pendiente", color: "var(--brand-orange)" },
    "en-camino": { label: "En camino", color: "var(--brand-blue)" },
    entregada: { label: "Entregada", color: "var(--brand-green)" },
  };
  const s = map[status];
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
      style={{ background: s.color }}
    >
      {s.label}
    </span>
  );
}
