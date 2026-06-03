import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleHeader } from "@/components/role-header";
import { CATEGORY_COLOR } from "@/lib/los-nietos-data";
import { listProducts, type Product } from "@/lib/products.functions";

export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "Cliente · Los Nietos" },
      { name: "description", content: "Compra rápida en Los Nietos con pago en 30 segundos." },
    ],
  }),
  component: CustomerPage,
});

type CartItem = Product & { qty: number };
type Modal = null | "ai" | "payment" | "mp" | "success";
type Receipt = {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  method: "mp" | "cash";
  mpId?: string;
  status: "PAGADO" | "PAGO AL ENTREGAR";
};

function CustomerPage() {
  const navigate = useNavigate();
  const fetchProducts = useServerFn(listProducts);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [wa, setWa] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [mpId] = useState(() => `MP-${Math.random().toString(36).slice(2, 11).toUpperCase()}`);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const shipping = subtotal === 0 ? 0 : subtotal >= 500 ? 0 : 30;
  const total = subtotal + shipping;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const add = (p: Product) => {
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      return ex
        ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { ...p, qty: 1 }];
    });
    showToast(`✓ ${p.name} agregado`);
  };

  const remove = (id: string) => setCart((c) => c.filter((i) => i.id !== id));

  const quickOrder = () => {
    const corona = products.find((p) => p.name.toLowerCase().includes("corona"));
    const hielo = products.find((p) => p.name.toLowerCase().includes("hielo"));
    const items: CartItem[] = [];
    if (corona) items.push({ ...corona, qty: 5 });
    if (hielo) items.push({ ...hielo, qty: 5 });
    if (items.length === 0) {
      showToast("Sin productos disponibles");
      return;
    }
    setCart(items);
    showToast("✓ Último pedido cargado");
  };

  const finishOrder = (method: "mp" | "cash") => {
    const orderId = `ORD-2024-${Math.floor(Math.random() * 900 + 100)}`;
    const r: Receipt = {
      id: orderId,
      date: new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
      items: cart, subtotal, shipping, total, method,
      mpId: method === "mp" ? mpId : undefined,
      status: method === "mp" ? "PAGADO" : "PAGO AL ENTREGAR",
    };
    setReceipt(r);
    setCart([]);
    setModal("success");
    setWa(`📱 WhatsApp: ✓ ${r.status} · ${orderId} · $${r.total}`);
    setTimeout(() => setWa(null), 4500);
    showToast(method === "mp" ? "✓ Pago confirmado por Mercado Pago" : "✓ Pedido registrado · Cobro al entregar");
  };

  const downloadReceipt = () => {
    if (!receipt) return;
    const lines = [
      "LOS NIETOS — COMPROBANTE",
      `Folio: ${receipt.id}`,
      `Fecha: ${receipt.date}`,
      `Estado: ${receipt.status}`,
      `Método: ${receipt.method === "mp" ? `Mercado Pago (${receipt.mpId})` : "Efectivo al entregar"}`,
      "",
      ...receipt.items.map((i) => `${i.qty} × ${i.name}  $${i.price * i.qty}`),
      "",
      `Subtotal: $${receipt.subtotal}`,
      `Envío: ${receipt.shipping === 0 ? "GRATIS" : `$${receipt.shipping}`}`,
      `TOTAL: $${receipt.total}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Los-Nietos-${receipt.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <RoleHeader title="🛒 Compra" right={<span className="text-sm">Hola, Carlos 👋</span>} />

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <section
          className="rounded-2xl p-4"
          style={{ background: "var(--soft-orange)", borderLeft: "4px solid var(--brand-orange)" }}
        >
          <div className="text-xs font-bold tracking-wide" style={{ color: "var(--brand-orange)" }}>
            ⚡ REPITE TU ÚLTIMO PEDIDO
          </div>
          <button
            onClick={quickOrder}
            className="mt-2 w-full sm:w-auto rounded-xl px-5 py-3 font-semibold text-white bg-gradient-orange shadow-card"
          >
            Pedir lo mismo (Corona + Hielo)
          </button>
        </section>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Cargando productos…</p>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aún no hay productos. El dueño debe darlos de alta en /owner.
          </p>
        ) : (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                disabled={p.stock <= 0}
                className="bg-card rounded-2xl p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: `2px solid ${CATEGORY_COLOR[p.category] ?? "var(--brand-blue)"}` }}
              >
                <div className="text-3xl mb-1">🛍️</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {p.category}
                </div>
                <div className="text-sm font-semibold leading-tight">{p.name}</div>
                <div className="text-base font-bold mt-1" style={{ color: "var(--brand-green)" }}>
                  ${p.price}
                </div>
                {p.stock <= 0 && (
                  <div className="text-[10px] mt-1 font-bold" style={{ color: "var(--brand-red)" }}>
                    SIN STOCK
                  </div>
                )}
              </button>
            ))}
          </section>
        )}

        {cart.length > 0 && (
          <section className="bg-card rounded-2xl p-5 shadow-card">
            <h3 className="font-display text-lg mb-3">Mi carrito ({cart.length})</h3>
            <ul className="divide-y divide-border">
              {cart.map((i) => (
                <li key={i.id} className="py-2 flex items-center justify-between text-sm">
                  <span>
                    {i.name} <span className="text-muted-foreground">× {i.qty}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">${i.price * i.qty}</span>
                    <button
                      onClick={() => remove(i.id)}
                      className="w-7 h-7 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-card rounded-2xl p-5" style={{ border: "2px solid var(--brand-orange)" }}>
          <Row label="Subtotal" value={`$${subtotal}`} />
          <Row
            label="Envío"
            value={subtotal >= 500 ? "GRATIS" : `$${shipping}`}
            valueColor={subtotal >= 500 ? "var(--brand-green)" : undefined}
          />
          <div className="h-px bg-border my-2" />
          <Row label="TOTAL" value={`$${total}`} bold valueColor="var(--brand-red)" />
          <button
            disabled={cart.length === 0}
            onClick={() => setModal("payment")}
            className="mt-4 w-full rounded-xl py-3.5 font-bold text-white bg-gradient-green shadow-card disabled:opacity-40 disabled:cursor-not-allowed"
          >
            PAGAR EN 30 SEGUNDOS
          </button>
        </section>
      </main>

      {modal === "payment" && (
        <Modal onClose={() => setModal(null)} accent="var(--brand-blue)" title="Forma de pago">
          <button onClick={() => setModal("mp")} className="w-full rounded-xl py-3 mt-2 font-semibold text-white" style={{ background: "var(--brand-blue)" }}>
            💳 Mercado Pago
          </button>
          <button onClick={() => finishOrder("cash")} className="w-full rounded-xl py-3 mt-2 font-semibold text-white bg-gradient-green">
            💵 Efectivo
          </button>
          <button onClick={() => setModal(null)} className="w-full rounded-xl py-3 mt-2 font-semibold bg-muted">
            Cancelar
          </button>
        </Modal>
      )}

      {modal === "mp" && (
        <Modal onClose={() => setModal(null)} accent="var(--brand-blue)" title="Mercado Pago">
          <div className="rounded-xl p-4 bg-muted text-center">
            <div className="text-xs text-muted-foreground">Total a pagar</div>
            <div className="font-display text-3xl my-1">${total}</div>
            <div className="text-[11px] text-muted-foreground">ID: {mpId}</div>
          </div>
          <button onClick={() => finishOrder("mp")} className="mt-4 w-full rounded-xl py-3 font-semibold text-white bg-gradient-green">
            ✓ Confirmar pago
          </button>
        </Modal>
      )}

      {modal === "success" && receipt && (
        <Modal onClose={() => { setModal(null); navigate({ to: "/" }); }} accent={receipt.method === "mp" ? "var(--brand-blue)" : "var(--brand-green)"} title="">
          <div className="text-center">
            <div className="text-5xl mb-1">✓</div>
            <h3 className="font-display text-2xl">¡Pedido Confirmado!</h3>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: receipt.method === "mp" ? "var(--brand-green)" : "var(--brand-orange)" }}>
              {receipt.status}
            </span>
          </div>
          <div className="mt-4 rounded-xl border-2 border-dashed p-4 text-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Comprobante</span><span>{receipt.date}</span>
            </div>
            <div className="font-mono text-sm font-bold mt-0.5">{receipt.id}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {receipt.method === "mp" ? `Mercado Pago · ${receipt.mpId}` : "Efectivo al entregar"}
            </div>
            <ul className="mt-3 divide-y divide-border">
              {receipt.items.map((i) => (
                <li key={i.id} className="py-1.5 flex justify-between">
                  <span>{i.qty} × {i.name}</span>
                  <span className="font-semibold">${i.price * i.qty}</span>
                </li>
              ))}
            </ul>
            <div className="h-px bg-border my-2" />
            <Row label="Subtotal" value={`$${receipt.subtotal}`} />
            <Row label="Envío" value={receipt.shipping === 0 ? "GRATIS" : `$${receipt.shipping}`} valueColor={receipt.shipping === 0 ? "var(--brand-green)" : undefined} />
            <Row label="TOTAL" value={`$${receipt.total}`} bold valueColor="var(--brand-red)" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={downloadReceipt} className="flex-1 rounded-xl py-3 font-semibold border-2" style={{ borderColor: "var(--brand-blue)", color: "var(--brand-blue)" }}>
              ⬇ Descargar
            </button>
            <button onClick={() => { setModal(null); navigate({ to: "/" }); }} className="flex-1 rounded-xl py-3 font-semibold text-white bg-gradient-green">
              Listo
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-white text-sm font-semibold shadow-lift animate-toast" style={{ background: "var(--brand-green)" }}>
          {toast}
        </div>
      )}
      {wa && (
        <div className="fixed bottom-5 left-5 z-50 rounded-xl px-4 py-3 text-white text-xs font-semibold shadow-lift animate-toast max-w-[260px]" style={{ background: "linear-gradient(135deg, var(--brand-blue), var(--brand-green))" }}>
          {wa}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-bold text-base" : ""}`}>
      <span>{label}</span>
      <span style={{ color: valueColor }}>{value}</span>
    </div>
  );
}

function Modal({ title, accent, children, onClose }: { title: string; accent: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md p-6 animate-modal" style={{ borderTop: `4px solid ${accent}` }} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="font-display text-xl mb-2">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
