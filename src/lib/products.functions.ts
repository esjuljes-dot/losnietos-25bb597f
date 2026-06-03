import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  sales: number;
};

// Public read — anyone (customer, driver) can list products
export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,cost,category,stock,sales")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
});

const ProductInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(1_000_000),
  cost: z.number().int().min(0).max(1_000_000),
  category: z.string().trim().min(1).max(40),
  stock: z.number().int().min(0).max(1_000_000),
  sales: z.number().int().min(0).max(10_000_000),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProductInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: sb } = context;
    if (data.id) {
      const { error } = await sb.from("products").update({
        name: data.name, price: data.price, cost: data.cost,
        category: data.category, stock: data.stock, sales: data.sales,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const { data: row, error } = await sb.from("products").insert({
        name: data.name, price: data.price, cost: data.cost,
        category: data.category, stock: data.stock, sales: data.sales,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, id: row.id };
    }
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
