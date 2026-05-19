import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas o dono pode executar esta ação.");
}

export const createBarber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        full_name: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(40).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      throw new Error(error?.message ?? "Falha ao criar usuário.");
    }
    const newUserId = created.user.id;

    // O trigger handle_new_user cria profile + role automaticamente.
    // Garante role = barber (o primeiro usuário vira owner; aqui já existe um owner, então virá barber).
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: "barber" }, { onConflict: "user_id,role" });

    if (data.phone) {
      await supabaseAdmin.from("profiles").update({ phone: data.phone }).eq("id", newUserId);
    }

    return { id: newUserId };
  });

export const updateBarberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        barber_id: z.string().uuid(),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.barber_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBarber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ barber_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    if (data.barber_id === context.userId) {
      throw new Error("Você não pode remover a si mesmo.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.barber_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
