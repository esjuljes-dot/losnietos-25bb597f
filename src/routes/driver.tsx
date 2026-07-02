import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RoleHeader } from "@/components/role-header";
import { type Order } from "@/lib/los-nietos-data";
import { saveDriverLocation, useDrivers, useOrders, updateOrderStatus } from "@/lib/orders-store";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Repartidores · Los Nietos" },
      {
        name: "description",
        content: "App de repartidores Los Nietos: entregas asignadas, GPS y ruta al cliente.",
      },
      { name: "apple-mobile-web-app-title", content: "Repartidores" },
    ],
    links: [{ rel: "manifest", href: "/driver.webmanifest" }],
  }),
  component: DriverPage,
});

const STORAGE_KEY = "ln-driver-code";
const WHATSAPP_COUNTRY_CODE = "52";

type Pos = { lat: number; lng: number; accuracy?: number };

function whatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith(WHATSAPP_COUNTRY_CODE)
    ? digits
    : `${WHATSAPP_COUNTRY_CODE}${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function customerDeliveryMessage(order: Order, driverName: string) {
  return [
    `Hola ${order.customer}, soy ${driverName}, repartidor de Los Nietos.`,
    `Voy con tu pedido ${order.id} por $${order.total}.`,
    `Dirección: ${order.address}.`,
    order.paid
      ? "El pedido aparece pagado."
      : `Forma de pago: ${order.payment}. Total a cobrar: $${order.total}.`,
  ].join("\n");
}

function haversineKm(a: Pos, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function useGeolocation(active: boolean) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !navigator.geolocation) {
      setErr("Geolocalización no disponible");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (p) =>
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      (e) => setErr(e.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active]);

  return { pos, err };
}

function DriverPage() {
  const queryClient = useQueryClient();
  const [driverCode, setDriverCode] = useState<string>("");
  const drivers = useDrivers();
  const orders = useOrders();
  const [tab, setTab] = useState<"pendientes" | "entregadas">("pendientes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order["status"] }) =>
      updateOrderStatus(id, status, driverCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
    onError: (error) => showToast(error instanceof Error ? error.message : "No se pudo actualizar"),
  });

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setDriverCode(saved);
  }, []);

  const driver = drivers.find((d) => d.code === driverCode);
  const { pos: myPos, err: geoErr } = useGeolocation(!!driver);

  useEffect(() => {
    if (!driver || !myPos) return;
    saveDriverLocation(driver.code, myPos).catch((error) =>
      console.warn("No se pudo guardar GPS del repartidor", error),
    );
  }, [driver, myPos]);

  const myOrders = useMemo(
    () => orders.filter((o) => o.driverCode === driverCode),
    [orders, driverCode],
  );
  const pendientes = myOrders.filter((o) => o.status !== "entregada");
  const entregadas = myOrders.filter((o) => o.status === "entregada");

  const list = tab === "pendientes" ? pendientes : entregadas;
  const selected = list.find((o) => o.id === selectedId) ?? list[0];

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const pickDriver = (code: string) => {
    setDriverCode(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const logoutDriver = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDriverCode("");
    setSelectedId(null);
  };

  // Driver picker
  if (!driver) {
    return (
      <div className="min-h-screen bg-background">
        <RoleHeader title="🏍️ Entregas" />
        <main className="max-w-md mx-auto px-4 py-8">
          <h2 className="font-display text-2xl mb-1">Identifícate</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Selecciona tu código de repartidor para ver tus entregas y activar el GPS.
          </p>
          <ul className="space-y-2">
            {drivers.map((d) => (
              <li key={d.code}>
                <button
                  onClick={() => pickDriver(d.code)}
                  className="w-full flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-card hover:bg-accent transition-colors text-left"
                >
                  <div>
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.phone}</div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: "var(--brand-blue)" }}
                  >
                    {d.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </main>
      </div>
    );
  }

  const distanceKm = selected && myPos ? haversineKm(myPos, selected) : null;
  const etaMin = distanceKm != null ? Math.max(1, Math.round((distanceKm / 25) * 60)) : null; // 25 km/h moto urbana

  const mapSrc = selected
    ? myPos
      ? `https://maps.google.com/maps?saddr=${myPos.lat},${myPos.lng}&daddr=${selected.lat},${selected.lng}&output=embed`
      : `https://www.google.com/maps?q=${selected.lat},${selected.lng}&z=16&output=embed`
    : null;

  const directionsHref = selected
    ? myPos
      ? `https://www.google.com/maps/dir/?api=1&origin=${myPos.lat},${myPos.lng}&destination=${selected.lat},${selected.lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`
    : "#";

  return (
    <div className="min-h-screen bg-background pb-10">
      <RoleHeader
        title="🏍️ Entregas"
        right={
          <button
            onClick={logoutDriver}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Salir
          </button>
        }
      />

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Driver badge */}
        <section className="bg-card rounded-2xl p-4 shadow-card flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-semibold">REPARTIDOR</div>
            <div className="font-display text-lg">{driver.name}</div>
            <div className="text-[11px] mt-1 flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: myPos ? "var(--brand-green)" : "var(--brand-orange)" }}
              />
              {myPos
                ? `GPS activo · ±${Math.round(myPos.accuracy ?? 0)}m`
                : geoErr
                  ? `GPS: ${geoErr}`
                  : "Buscando GPS…"}
            </div>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ background: "var(--brand-blue)" }}
          >
            {driver.code}
          </span>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Pendientes" value={pendientes.length} color="var(--brand-orange)" />
          <Stat label="Entregadas" value={entregadas.length} color="var(--brand-green)" />
          <Stat label="Total hoy" value={myOrders.length} color="var(--brand-blue)" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-muted rounded-xl p-1">
          {(["pendientes", "entregadas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setSelectedId(null);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                tab === t ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t} ({t === "pendientes" ? pendientes.length : entregadas.length})
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="bg-card rounded-2xl p-8 text-center shadow-card">
            <div className="text-4xl mb-2">📭</div>
            <div className="text-sm text-muted-foreground">
              Sin entregas {tab === "pendientes" ? "pendientes" : "completadas"}.
            </div>
          </div>
        )}

        {/* Order list */}
        {list.length > 0 && (
          <section className="space-y-2">
            {list.map((o) => {
              const dist = myPos ? haversineKm(myPos, o) : null;
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={`w-full bg-card rounded-xl p-3 shadow-card text-left border-2 transition-colors ${
                    selected?.id === o.id ? "border-primary" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {o.id} · {o.customer}
                    </span>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">📍 {o.address}</div>
                  <div className="text-xs mt-1 flex justify-between">
                    <span>
                      {o.items.length} prod. · ${o.total}
                      {dist != null && ` · ${dist.toFixed(1)} km`}
                    </span>
                    <span className="font-semibold">
                      {o.payment} {o.paid ? "· PAGADO" : "· COBRAR"}
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* Selected order detail */}
        {selected && mapSrc && (
          <section className="bg-card rounded-2xl shadow-card overflow-hidden">
            {/* Map with live route */}
            <div className="relative w-full h-72 bg-muted">
              <iframe
                title={`Mapa ${selected.id}`}
                className="absolute inset-0 w-full h-full border-0"
                loading="lazy"
                src={mapSrc}
              />
              {distanceKm != null && (
                <div className="absolute top-2 left-2 bg-card/95 backdrop-blur rounded-lg px-3 py-1.5 shadow-card text-xs font-bold">
                  📏 {distanceKm.toFixed(2)} km · ⏱ ~{etaMin} min
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold">{selected.id}</div>
                  <h3 className="font-display text-xl">{selected.customer}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <a href={`tel:${selected.phone}`} className="text-sm text-primary underline">
                      📞 {selected.phone}
                    </a>
                    <a
                      href={whatsappHref(
                        selected.phone,
                        customerDeliveryMessage(selected, driver.name),
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold underline"
                      style={{ color: "var(--brand-green)" }}
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
                <StatusPill status={selected.status} />
              </div>

              <div>
                <div className="text-xs text-muted-foreground font-semibold">📍 DIRECCIÓN</div>
                <div className="text-sm">{selected.address}</div>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block rounded-xl px-4 py-2 font-semibold text-white text-sm"
                  style={{ background: "var(--brand-blue)" }}
                >
                  🧭 Abrir en Google Maps
                </a>
              </div>

              <div>
                <div className="text-xs text-muted-foreground font-semibold">💳 FORMA DE PAGO</div>
                <div className="text-sm font-semibold">
                  {selected.payment}{" "}
                  <span
                    className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{
                      background: selected.paid ? "var(--brand-green)" : "var(--brand-orange)",
                    }}
                  >
                    {selected.paid ? "PAGADO" : `COBRAR $${selected.total}`}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground font-semibold">📝 INDICACIONES</div>
                <div className="text-sm bg-muted rounded-lg p-2.5 mt-1">{selected.notes}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground font-semibold mb-1">🛒 PRODUCTOS</div>
                <ul className="text-sm divide-y divide-border border border-border rounded-lg">
                  {selected.items.map((it, i) => (
                    <li key={i} className="flex justify-between px-3 py-2">
                      <span>
                        {it.qty}× {it.name}
                      </span>
                      <span className="font-semibold">${it.qty * it.price}</span>
                    </li>
                  ))}
                  <li className="flex justify-between px-3 py-2 font-bold bg-muted">
                    <span>TOTAL</span>
                    <span>${selected.total}</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              {selected.status !== "entregada" && (
                <div className="space-y-2 pt-1">
                  {selected.status === "pendiente" && (
                    <button
                      onClick={() => {
                        statusMutation.mutate({ id: selected.id, status: "en-camino" });
                        showToast("🏍️ En camino");
                      }}
                      className="w-full rounded-2xl py-3 font-bold text-white shadow-card"
                      style={{ background: "var(--brand-blue)" }}
                    >
                      🏍️ INICIAR ENTREGA
                    </button>
                  )}
                  <button
                    onClick={() => {
                      statusMutation.mutate({ id: selected.id, status: "entregada" });
                      showToast("✓ Entrega completada");
                      setTab("entregadas");
                    }}
                    className="w-full rounded-2xl py-3 font-bold text-white bg-gradient-green shadow-card"
                  >
                    ✓ MARCAR ENTREGADA
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card rounded-xl p-3 shadow-card text-center">
      <div className="font-display text-2xl" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground font-semibold uppercase">{label}</div>
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
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white whitespace-nowrap"
      style={{ background: s.color }}
    >
      {s.label}
    </span>
  );
}
