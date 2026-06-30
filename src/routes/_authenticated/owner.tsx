import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleHeader } from "@/components/role-header";
import { DRIVERS, type Order } from "@/lib/los-nietos-data";
import { useOrders } from "@/lib/orders-store";
import { listProducts, upsertProduct, deleteProduct, type Product } from "@/lib/products.functions";
import { runSalesAnalysis } from "@/lib/ai-analysis.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({
    meta: [
      { title: "Dueño · Los Nietos" },
      { name: "description", content: "Dashboard, productos y análisis IA." },
    ],
  }),
  component: OwnerPage,
});

const HOURLY = [12, 28, 22, 35, 48, 55, 40, 30];
const HOURS = ["8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];

type Tab = "dashboard" | "productos" | "entregas";

function OwnerPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleHeader
        title="📊 Panel del Dueño"
        right={
          <button onClick={signOut} className="text-xs font-semibold underline">
            Cerrar sesión
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {(["dashboard", "productos", "entregas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {t === "dashboard" ? "📈 Dashboard" : t === "productos" ? "📦 Productos" : "🏍️ Entregas"}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {tab === "dashboard" && <DashboardSection />}
        {tab === "productos" && <ProductsSection />}
        {tab === "entregas" && <DeliveriesSection />}
      </main>
    </div>
  );
}

function DashboardSection() {
  const fetchProducts = useServerFn(listProducts);
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });
  const orders = useOrders();
  const [aiOpen, setAiOpen] = useState(false);

  const metrics = useMemo(() => {
    const sales = products.reduce((s, p) => s + p.price * p.sales, 0);
    const margin = products.reduce((s, p) => s + (p.price - p.cost) * p.sales, 0);
    return { sales, orders: orders.length, customers: new Set(orders.map((o) => o.customer)).size, margin };
  }, [products, orders]);


  const top = useMemo(
    () => [...products].map((p) => ({ ...p, mar: (p.price - p.cost) * p.sales })).sort((a, b) => b.mar - a.mar).slice(0, 5),
    [products],
  );

  const lowStock = products.filter((p) => p.stock <= 5);
  const maxBar = Math.max(...HOURLY);

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Ventas" value={`$${metrics.sales.toLocaleString()}`} delta="+12%" color="var(--brand-blue)" />
        <MetricCard label="Pedidos" value={metrics.orders} delta="+8%" color="var(--brand-red)" />
        <MetricCard label="Clientes" value={metrics.customers} delta="+5%" color="var(--brand-orange)" />
        <MetricCard label="Margen" value={`$${metrics.margin.toLocaleString()}`} delta="+15%" color="var(--brand-green)" />
      </section>

      {lowStock.length > 0 && (
        <section className="rounded-xl p-4 text-sm font-medium" style={{ background: "var(--soft-red)", borderLeft: "4px solid var(--brand-red)", color: "oklch(0.45 0.18 25)" }}>
          <strong>⚠ Stock bajo:</strong> {lowStock.map((p) => `${p.name} (${p.stock})`).join(" · ")}
        </section>
      )}

      <section className="bg-card rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Ventas por hora</h2>
          <span className="text-xs text-muted-foreground">Hoy</span>
        </div>
        <div className="flex items-end gap-2 h-44">
          {HOURLY.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full rounded-t-md bg-gradient-chart transition-all group-hover:opacity-80" style={{ height: `${(v / maxBar) * 100}%` }} />
              <span className="text-[10px] text-muted-foreground">{HOURS[i]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h2 className="font-display text-lg mb-3">Top 5 productos</h2>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin productos.</p>
          ) : (
            <ul className="divide-y divide-border">
              {top.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--brand-green)" }}>${p.mar.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-card flex flex-col">
          <h2 className="font-display text-lg mb-2">Análisis IA <span className="text-xs font-normal text-muted-foreground">(en vivo)</span></h2>
          <p className="text-sm text-muted-foreground flex-1">
            La IA analiza tus productos reales y sugiere precios, stock y combos.
          </p>
          <button
            onClick={() => setAiOpen(true)}
            className="mt-4 rounded-xl py-3 font-semibold text-white bg-gradient-hero hover:opacity-90 transition-opacity"
          >
            ⚡ Ejecutar análisis IA
          </button>
        </div>
      </section>

      {aiOpen && <AiModal onClose={() => setAiOpen(false)} />}
    </>
  );
}

function AiModal({ onClose }: { onClose: () => void }) {
  const runAi = useServerFn(runSalesAnalysis);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-analysis"],
    queryFn: () => runAi(),
    staleTime: 60_000,
    retry: false,
  });

  const toneMap: Record<string, string> = {
    green: "var(--brand-green)", red: "var(--brand-red)",
    purple: "var(--brand-purple)", blue: "var(--brand-blue)", orange: "var(--brand-orange)",
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md p-6 animate-modal max-h-[85vh] overflow-y-auto" style={{ borderTop: "4px solid var(--brand-blue)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl mb-3">⚡ Análisis IA</h3>

        {isLoading && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2 animate-pulse">🧠</div>
            <p className="text-sm text-muted-foreground">Analizando tus ventas…</p>
          </div>
        )}

        {error && (
          <div className="text-sm rounded-lg p-3" style={{ background: "var(--soft-red)", color: "oklch(0.45 0.18 25)" }}>
            {error instanceof Error ? error.message : "Error"}
          </div>
        )}

        {data && (
          <>
            <p className="text-sm mb-4 italic text-muted-foreground">{data.summary}</p>
            <div className="space-y-2">
              {data.recommendations.map((r, i) => (
                <div key={i} className="rounded-xl p-3 flex gap-3 items-start" style={{ background: "var(--muted)", borderLeft: `4px solid ${toneMap[r.tone] ?? "var(--brand-blue)"}` }}>
                  <div className="text-2xl">{r.icon}</div>
                  <div>
                    <div className="font-semibold text-sm">{r.title}</div>
                    <div className="text-sm text-muted-foreground">{r.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={onClose} className="mt-5 w-full rounded-xl py-3 font-semibold text-white bg-gradient-hero">
          OK
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: "", price: 0, cost: 0, category: "Cerveza", stock: 0, sales: 0 };

function ProductsSection() {
  const qc = useQueryClient();
  const fetchProducts = useServerFn(listProducts);
  const saveProduct = useServerFn(upsertProduct);
  const removeProduct = useServerFn(deleteProduct);
  const { data: products = [], isLoading } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });

  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: (input: typeof EMPTY_FORM & { id?: string }) => saveProduct({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false); setEditing(null); setForm(EMPTY_FORM);
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => removeProduct({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  function openNew() {
    setEditing(null); setForm(EMPTY_FORM); setOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, price: p.price, cost: p.cost, category: p.category, stock: p.stock, sales: p.sales });
    setOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveMut.mutate(editing ? { ...form, id: editing.id } : form);
  }

  return (
    <section className="bg-card rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg">📦 Productos ({products.length})</h2>
        <button onClick={openNew} className="rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-hero">
          + Nuevo
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Sin productos. Agrega el primero.</p>
      ) : (
        <ul className="divide-y divide-border">
          {products.map((p) => (
            <li key={p.id} className="py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.category} · ${p.price} · stock {p.stock} · ventas {p.sales}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="text-xs px-3 py-1.5 rounded-lg bg-muted font-semibold">Editar</button>
                <button
                  onClick={() => { if (confirm(`¿Borrar ${p.name}?`)) delMut.mutate(p.id); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                  style={{ background: "var(--brand-red)" }}
                >Borrar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form onSubmit={submit} className="bg-card rounded-2xl w-full max-w-md p-6 animate-modal space-y-3" style={{ borderTop: "4px solid var(--brand-blue)" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl">{editing ? "Editar producto" : "Nuevo producto"}</h3>
            <Field label="Nombre">
              <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background" />
            </Field>
            <Field label="Categoría">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                <option>Cerveza</option><option>Refrescos</option><option>Botanas</option><option>Otros</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Precio $"><NumberInput value={form.price} onChange={(v) => setForm({ ...form, price: v })} /></Field>
              <Field label="Costo $"><NumberInput value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} /></Field>
              <Field label="Stock"><NumberInput value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} /></Field>
              <Field label="Ventas"><NumberInput value={form.sales} onChange={(v) => setForm({ ...form, sales: v })} /></Field>
            </div>

            {saveMut.error && (
              <div className="text-xs rounded-lg p-2" style={{ background: "var(--soft-red)", color: "oklch(0.45 0.18 25)" }}>
                {saveMut.error instanceof Error ? saveMut.error.message : "Error"}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl py-2.5 font-semibold bg-muted">Cancelar</button>
              <button type="submit" disabled={saveMut.isPending} className="flex-1 rounded-xl py-2.5 font-semibold text-white bg-gradient-green disabled:opacity-50">
                {saveMut.isPending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label.toUpperCase()}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number" min={0} required value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="w-full px-3 py-2 rounded-lg border border-border bg-background"
    />
  );
}

function DeliveriesSection() {
  const orders = useOrders();
  const [tab, setTab] = useState<"pendientes" | "entregadas">("pendientes");
  const [driverFilter, setDriverFilter] = useState<string>("todos");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = tab === "pendientes" ? o.status !== "entregada" : o.status === "entregada";
      const matchDriver = driverFilter === "todos" || o.driverCode === driverFilter;
      return matchStatus && matchDriver;
    });
  }, [orders, tab, driverFilter]);

  const pendCount = orders.filter((o) => o.status !== "entregada").length;
  const entCount = orders.filter((o) => o.status === "entregada").length;


  return (
    <section className="bg-card rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-lg">🏍️ Entregas y repartidores</h2>
        <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 font-medium">
          <option value="todos">Todos los repartidores</option>
          {DRIVERS.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {DRIVERS.map((d) => {
          const count = orders.filter((o: Order) => o.driverCode === d.code && o.status !== "entregada").length;
          return (
            <button key={d.code} onClick={() => setDriverFilter(d.code)} className={`rounded-xl p-2 text-left border-2 transition-colors ${driverFilter === d.code ? "border-primary bg-accent" : "border-transparent bg-muted"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: "var(--brand-blue)" }}>{d.code}</span>
                <span className="font-display text-base">{count}</span>
              </div>
              <div className="text-[11px] font-semibold truncate mt-1">{d.name}</div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 bg-muted rounded-xl p-1 mb-3">
        {(["pendientes", "entregadas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {t} ({t === "pendientes" ? pendCount : entCount})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-6">Sin pedidos.</div>
      ) : (
        <ul className="space-y-2">{filtered.map((o) => <OrderRow key={o.id} order={o} />)}</ul>
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
      <button onClick={() => setOpen((v) => !v)} className="w-full p-3 text-left hover:bg-accent transition-colors">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ background: "var(--brand-blue)" }}>{order.driverCode}</span>
            <span className="font-semibold text-sm">{order.id} · {order.customer}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">${order.total}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: s.color }}>{s.label}</span>
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
              <a href={`tel:${order.phone}`} className="text-primary underline text-xs">📞 {order.phone}</a>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">REPARTIDOR</div>
              <div>{driver?.name} ({order.driverCode})</div>
              <div className="text-xs text-muted-foreground">{driver?.phone}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold text-muted-foreground">DIRECCIÓN</div>
              <div>{order.address}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">PAGO</div>
              <div className="font-semibold">
                {order.payment}{" "}
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: order.paid ? "var(--brand-green)" : "var(--brand-orange)" }}>
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
                    <span>{it.qty}× {it.name}</span>
                    <span className="font-semibold">${it.qty * it.price}</span>
                  </li>
                ))}
                <li className="flex justify-between px-3 py-1.5 text-xs font-bold bg-muted">
                  <span>TOTAL</span><span>${order.total}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function MetricCard({ label, value, delta, color }: { label: string; value: string | number; delta: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
      <div className="text-xs font-semibold mt-1" style={{ color: "var(--brand-green)" }}>{delta} vs ayer</div>
    </div>
  );
}
