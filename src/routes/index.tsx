import { createFileRoute, Link } from "@tanstack/react-router";
import logo from "@/assets/logo-los-nietos.jpeg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Los Nietos — Selecciona tu rol" },
      { name: "description", content: "Entra como Dueño o Repartidor en Los Nietos." },
    ],
  }),
  component: RoleSelector,
});

type Role = {
  to: "/owner" | "/driver";
  icon: string;
  name: string;
  desc: string;
  color: string;
};

const ROLES: Role[] = [
  {
    to: "/owner",
    icon: "📊",
    name: "Dueño",
    desc: "Dashboard + IA + Entregas",
    color: "var(--brand-blue)",
  },
  {
    to: "/driver",
    icon: "🏍️",
    name: "Repartidor",
    desc: "Mis entregas + GPS",
    color: "var(--brand-orange)",
  },
];

function RoleSelector() {
  return (
    <main className="bg-gradient-hero min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <header className="text-center mb-10 text-white w-full max-w-3xl">
        <img
          src={logo.url}
          alt="Los Nietos - Semillas y Cereales"
          className="mx-auto w-full rounded-2xl shadow-lift object-contain"
        />
        <p className="mt-4 text-lg font-medium opacity-95">Tu Tienda de Confianza</p>
      </header>

      <div className="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-2 gap-4">
        {ROLES.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="group bg-card rounded-2xl p-8 text-center shadow-card hover:shadow-lift transition-all duration-200 hover:-translate-y-2"
            style={{ border: `3px solid ${r.color}` }}
          >
            <div className="text-6xl mb-3" aria-hidden>
              {r.icon}
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{r.name}</div>
            <div className="text-sm text-muted-foreground mt-1">{r.desc}</div>
          </Link>
        ))}
      </div>

      <footer className="mt-12 text-white/90 text-xs text-center">
        Av. 18 de Marzo #940 · Tecomán, Colima · WhatsApp 313 328 58 82
      </footer>
    </main>
  );
}
