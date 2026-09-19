import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Composição da logo nas imagens de campanha (server-only).
 * O sharp é um módulo nativo: fica isolado neste arquivo `.server.ts`
 * (o Nitro/Vite trata `.server.ts` como código exclusivo do servidor)
 * e é importado dinamicamente para nunca entrar no bundle do cliente.
 */

const LOGO_CANDIDATE_PATHS = [
  path.resolve(process.cwd(), "src/assets/manoelves-logo.png"),
  "/opt/manoelves/src/assets/manoelves-logo.png",
];

async function loadLogo(logoUrl: string | null | undefined): Promise<Buffer | null> {
  // 1) Logo cadastrada no banco (barbershop.logo_url — URL pública do storage).
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch {
      /* segue para o asset local */
    }
  }
  // 2) Asset do sistema no disco (dev local e VPS).
  for (const p of LOGO_CANDIDATE_PATHS) {
    try {
      return await readFile(p);
    } catch {
      /* tenta o próximo caminho */
    }
  }
  return null;
}

/**
 * Sobrepõe a logo no canto inferior direito da imagem gerada (1024x1024).
 * Se nenhuma logo for encontrada, devolve a imagem original intacta.
 */
export async function composeCampaignLogo(
  basePng: Buffer,
  logoUrl?: string | null,
): Promise<Buffer> {
  const logoBuf = await loadLogo(logoUrl);
  if (!logoBuf) return basePng;

  try {
    const sharp = (await import(/* @vite-ignore */ "sharp")).default;
    const logo = await sharp(logoBuf)
      .resize({ width: 220 })
      .png()
      .toBuffer();
    const meta = await sharp(logo).metadata();
    const margin = 28;
    const top = 1024 - (meta.height ?? 0) - margin;
    const left = 1024 - (meta.width ?? 0) - margin;
    return sharp(basePng)
      .composite([{ input: logo, top, left }])
      .png()
      .toBuffer();
  } catch {
    // Composição é cosmética: nunca deve derrubar a geração da imagem.
    return basePng;
  }
}
