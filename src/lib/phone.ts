// Normalização de telefone Brasil (E.164 sem +).
export function normalizePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D+/g, "");
  if (!digits) return digits;
  if (digits.length <= 11) return "55" + digits;
  return digits;
}
