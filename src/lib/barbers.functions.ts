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
        role: z.enum(["barber", "owner"]).default("barber"),
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
    // Garante o papel escolhido pelo dono (barber ou owner).
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: data.role }, { onConflict: "user_id,role" });

    if (data.phone) {
      await supabaseAdmin.from("profiles").update({ phone: data.phone }).eq("id", newUserId);
    }

    return { id: newUserId };
  });

export const listOwners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");
    const ids = (roles ?? []).map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const emailById = new Map<string, string>();
    for (const u of list?.users ?? []) emailById.set(u.id, u.email ?? "");
    return (profiles ?? []).map((p) => ({
      user_id: p.id,
      full_name: p.full_name ?? "—",
      email: emailById.get(p.id) ?? "",
    }));
  });

export const grantOwnerByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().trim().email().max(255) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    // Encontra o usuário já cadastrado com esse e-mail.
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);
    const found = (list?.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );
    if (!found) {
      throw new Error(
        "Nenhuma conta encontrada com esse e-mail. Cadastre a pessoa primeiro (abaixo) e depois adicione como dono.",
      );
    }
    const { error: upErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: found.id, role: "owner" }, { onConflict: "user_id,role" });
    if (upErr) throw new Error(upErr.message);
    return { id: found.id };
  });

export const removeOwnerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    if (data.user_id === context.userId) {
      throw new Error("Você não pode remover o próprio acesso de dono.");
    }
    const { data: owners } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");
    if ((owners ?? []).length <= 1) {
      throw new Error("O sistema precisa de pelo menos um dono.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true };
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
  .inputValidator((input) => z.object({ barber_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    if (data.barber_id === context.userId) {
      throw new Error("Você não pode remover a si mesmo.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.barber_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
