export type Product = {
  id: number;
  name: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  sales: number;
};

export const PRODUCTS: Product[] = [
  { id: 1, name: "Corona 600ml", price: 140, cost: 85, category: "Cerveza", stock: 3, sales: 48 },
  { id: 2, name: "Coca 1L", price: 45, cost: 28, category: "Refrescos", stock: 32, sales: 60 },
  { id: 3, name: "Tecate 24oz", price: 135, cost: 82, category: "Cerveza", stock: 18, sales: 30 },
  { id: 4, name: "Hielo 5kg", price: 35, cost: 15, category: "Otros", stock: 40, sales: 55 },
  { id: 5, name: "Modelo Especial", price: 145, cost: 90, category: "Cerveza", stock: 12, sales: 25 },
  { id: 6, name: "Sabritas 45g", price: 18, cost: 10, category: "Botanas", stock: 60, sales: 80 },
  { id: 7, name: "Doritos 45g", price: 18, cost: 10, category: "Botanas", stock: 45, sales: 70 },
  { id: 8, name: "Jarritos 600ml", price: 32, cost: 18, category: "Refrescos", stock: 28, sales: 42 },
];

export type Order = {
  id: string;
  customer: string;
  total: number;
  status: "pendiente" | "en-camino" | "entregada";
  progress: number;
  eta: number;
};

export const ORDERS: Order[] = [
  { id: "ORD-001", customer: "Carlos M.", total: 875, status: "en-camino", progress: 60, eta: 15 },
  { id: "ORD-002", customer: "María R.", total: 250, status: "pendiente", progress: 0, eta: 30 },
  { id: "ORD-003", customer: "Juan P.", total: 520, status: "entregada", progress: 100, eta: 0 },
];

export const CATEGORY_COLOR: Record<string, string> = {
  Cerveza: "var(--brand-blue)",
  Refrescos: "var(--brand-red)",
  Botanas: "var(--brand-orange)",
  Otros: "var(--brand-purple)",
};
