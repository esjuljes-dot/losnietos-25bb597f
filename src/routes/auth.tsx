import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-los-nietos.jpeg.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Acceso · Los Nietos" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/owner" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/owner` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/owner" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gradient-hero min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lift p-6">
        <div className="text-center mb-5">
          <img src={logo.url} alt="Los Nietos" className="mx-auto w-full max-w-[240px] rounded-xl shadow-card" />
          <p className="text-sm text-muted-foreground mt-3">Acceso del dueño</p>
        </div>

        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >Iniciar sesión</button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >Registrarse</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">EMAIL</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="dueno@losnietos.mx"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">CONTRASEÑA</label>
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background"
              placeholder="mínimo 6 caracteres"
            />
          </div>

          {error && (
            <div className="text-sm rounded-lg p-2" style={{ background: "var(--soft-red)", color: "oklch(0.45 0.18 25)" }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl py-3 font-semibold text-white bg-gradient-hero disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <Link to="/" className="block text-center mt-4 text-xs text-muted-foreground underline">
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
