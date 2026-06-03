import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const RecSchema = z.object({
  summary: z.string(),
  recommendations: z.array(
    z.object({
      icon: z.string(),
      title: z.string(),
      body: z.string(),
      tone: z.enum(["green", "red", "purple", "blue", "orange"]),
    }),
  ).min(2).max(6),
});

export const runSalesAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: products, error } = await context.supabase
      .from("products")
      .select("name,price,cost,category,stock,sales");
    if (error) throw new Error(error.message);

    if (!products || products.length === 0) {
      return {
        summary: "Aún no hay productos cargados para analizar.",
        recommendations: [],
      };
    }

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const productLines = products
      .map((p) => `- ${p.name} [${p.category}] precio $${p.price} costo $${p.cost} stock ${p.stock} ventas ${p.sales}`)
      .join("\n");

    try {
      const { experimental_output } = await generateText({
        model,
        experimental_output: Output.object({ schema: RecSchema }),
        system:
          "Eres un asesor de negocio para una tiendita de abarrotes mexicana llamada Los Nietos en Tecomán, Colima. Hablas español natural y directo. Generas recomendaciones accionables HOY basadas en los datos reales de ventas y stock. Sé específico con nombres de productos y números.",
        prompt:
          `Analiza estos productos y devuelve un resumen corto y 3-5 recomendaciones priorizadas (stock crítico, precio, combos, productos estrella, oportunidades). Usa los iconos 📈 📉 ⚠️ 🎯 💰 🔥 ⭐ según corresponda. Tono "red" para urgente, "orange" para advertencia, "green" para oportunidad de ingreso, "purple" para combos, "blue" para info.\n\nProductos:\n${productLines}`,
      });
      return experimental_output;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("La IA está saturada. Intenta de nuevo en un minuto.");
      if (msg.includes("402")) throw new Error("Se agotaron los créditos de IA. Recarga en Settings → Workspace.");
      throw new Error(`Error de IA: ${msg}`);
    }
  });
