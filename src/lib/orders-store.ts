import { useSyncExternalStore } from "react";
import { ORDERS as SEED, type Order } from "./los-nietos-data";

const KEY = "ln-orders-v1";
const listeners = new Set<() => void>();
let cache: Order[] | null = null;

function read(): Order[] {
  if (cache) return cache;
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Order[]) : SEED;
  } catch {
    cache = SEED;
  }
  return cache!;
}

function write(next: Order[]) {
  cache = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export function getOrders(): Order[] {
  return read();
}

export function updateOrderStatus(id: string, status: Order["status"]) {
  const next = read().map((o) =>
    o.id === id
      ? {
          ...o,
          status,
          progress: status === "entregada" ? 100 : status === "en-camino" ? 60 : 0,
          paid: status === "entregada" ? true : o.paid,
        }
      : o,
  );
  write(next);
}

export function useOrders(): Order[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => SEED,
  );
}
