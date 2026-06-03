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

export type Driver = {
  code: string; // R01..R05
  name: string;
  phone: string;
};

export const DRIVERS: Driver[] = [
  { code: "R01", name: "Luis Hernández", phone: "313-100-0001" },
  { code: "R02", name: "Pedro Ramírez", phone: "313-100-0002" },
  { code: "R03", name: "Miguel Torres", phone: "313-100-0003" },
  { code: "R04", name: "Jorge Vega", phone: "313-100-0004" },
  { code: "R05", name: "Ana Castillo", phone: "313-100-0005" },
];

export type OrderItem = { name: string; qty: number; price: number };

export type Order = {
  id: string;
  customer: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  items: OrderItem[];
  total: number;
  payment: "Efectivo" | "Mercado Pago";
  paid: boolean;
  notes: string;
  driverCode: string; // R01..R05
  status: "pendiente" | "en-camino" | "entregada";
  progress: number;
  eta: number;
};

export const ORDERS: Order[] = [
  {
    id: "ORD-001",
    customer: "Carlos Mendoza",
    phone: "313-200-1101",
    address: "Calle Nicolás Bravo #940, Col. Centro, Tecomán",
    lat: 18.9088,
    lng: -103.8744,
    items: [
      { name: "Corona 600ml", qty: 4, price: 140 },
      { name: "Hielo 5kg", qty: 1, price: 35 },
      { name: "Sabritas 45g", qty: 2, price: 18 },
    ],
    total: 631,
    payment: "Mercado Pago",
    paid: true,
    notes: "Casa color verde, portón negro. Tocar el timbre 2 veces.",
    driverCode: "R01",
    status: "en-camino",
    progress: 60,
    eta: 15,
  },
  {
    id: "ORD-002",
    customer: "María Robles",
    phone: "313-200-1102",
    address: "Av. Insurgentes #215, Col. Jardines, Tecomán",
    lat: 18.9135,
    lng: -103.8702,
    items: [
      { name: "Coca 1L", qty: 3, price: 45 },
      { name: "Doritos 45g", qty: 4, price: 18 },
    ],
    total: 207,
    payment: "Efectivo",
    paid: false,
    notes: "Pagar con $300, llevar cambio. Dejar en la tiendita.",
    driverCode: "R01",
    status: "pendiente",
    progress: 0,
    eta: 30,
  },
  {
    id: "ORD-003",
    customer: "Juan Pérez",
    phone: "313-200-1103",
    address: "Calle Hidalgo #88, Col. Reforma, Tecomán",
    lat: 18.9051,
    lng: -103.8801,
    items: [
      { name: "Tecate 24oz", qty: 3, price: 135 },
      { name: "Jarritos 600ml", qty: 2, price: 32 },
    ],
    total: 469,
    payment: "Mercado Pago",
    paid: true,
    notes: "Sin indicaciones.",
    driverCode: "R02",
    status: "entregada",
    progress: 100,
    eta: 0,
  },
  {
    id: "ORD-004",
    customer: "Sofía Núñez",
    phone: "313-200-1104",
    address: "Calle Morelos #432, Col. Las Palmas, Tecomán",
    lat: 18.9172,
    lng: -103.8765,
    items: [
      { name: "Modelo Especial", qty: 6, price: 145 },
      { name: "Hielo 5kg", qty: 2, price: 35 },
    ],
    total: 940,
    payment: "Efectivo",
    paid: false,
    notes: "Fiesta en el patio trasero, entrar por la cochera.",
    driverCode: "R03",
    status: "pendiente",
    progress: 0,
    eta: 25,
  },
  {
    id: "ORD-005",
    customer: "Rafael Ibarra",
    phone: "313-200-1105",
    address: "Calle Juárez #19, Col. Centro, Tecomán",
    lat: 18.9099,
    lng: -103.8758,
    items: [
      { name: "Corona 600ml", qty: 2, price: 140 },
      { name: "Sabritas 45g", qty: 3, price: 18 },
    ],
    total: 334,
    payment: "Mercado Pago",
    paid: true,
    notes: "Departamento 3B, segundo piso.",
    driverCode: "R01",
    status: "entregada",
    progress: 100,
    eta: 0,
  },
];

export const CATEGORY_COLOR: Record<string, string> = {
  Cerveza: "var(--brand-blue)",
  Refrescos: "var(--brand-red)",
  Botanas: "var(--brand-orange)",
  Otros: "var(--brand-purple)",
};
