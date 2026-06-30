import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DRIVERS as FALLBACK_DRIVERS,
  ORDERS as FALLBACK_ORDERS,
  type Driver,
  type Order,
} from "./los-nietos-data";

type OrderRow = {
  id: string;
  customer: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  total: number;
  payment: "Efectivo" | "Mercado Pago";
  paid: boolean;
  notes: string;
  driver_code: string;
  status: Order["status"];
  progress: number;
  eta: number;
  order_items?: Array<{ name: string; qty: number; price: number }>;
};

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customer: row.customer,
    phone: row.phone,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    items: (row.order_items ?? []).map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
    total: row.total,
    payment: row.payment,
    paid: row.paid,
    notes: row.notes,
    driverCode: row.driver_code,
    status: row.status,
    progress: row.progress,
    eta: row.eta,
  };
}

export async function fetchDrivers(): Promise<Driver[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("drivers")
    .select("code,name,phone")
    .eq("active", true)
    .order("code", { ascending: true });

  if (error) {
    console.warn(
      "No se pudieron cargar repartidores desde Supabase; usando respaldo local",
      error.message,
    );
    return FALLBACK_DRIVERS;
  }

  return (data ?? FALLBACK_DRIVERS) as Driver[];
}

export async function fetchOrders(): Promise<Order[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("orders")
    .select(
      "id,customer,phone,address,lat,lng,total,payment,paid,notes,driver_code,status,progress,eta,order_items(name,qty,price)",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.warn(
      "No se pudieron cargar entregas desde Supabase; usando respaldo local",
      error.message,
    );
    return FALLBACK_ORDERS;
  }

  return ((data ?? []) as OrderRow[]).map(mapOrder);
}

export async function updateOrderStatus(id: string, status: Order["status"], driverCode?: string) {
  if (driverCode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("update_order_status_by_driver", {
      _order_id: id,
      _driver_code: driverCode,
      _status: status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("orders")
    .update({
      status,
      progress: status === "entregada" ? 100 : status === "en-camino" ? 60 : 0,
      paid: status === "entregada" ? true : undefined,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function saveDriverLocation(
  driverCode: string,
  pos: { lat: number; lng: number; accuracy?: number },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("save_driver_location", {
    _driver_code: driverCode,
    _lat: pos.lat,
    _lng: pos.lng,
    _accuracy: pos.accuracy ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export function useDrivers(): Driver[] {
  const { data = FALLBACK_DRIVERS } = useQuery({
    queryKey: ["drivers"],
    queryFn: fetchDrivers,
    staleTime: 60_000,
  });
  return data;
}

export function useOrders(): Order[] {
  const { data = FALLBACK_ORDERS } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 15_000,
  });
  return data;
}
