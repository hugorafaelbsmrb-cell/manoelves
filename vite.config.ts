import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercelBuild = process.env.VERCEL === "1";

export default defineConfig({
  cloudflare: isVercelBuild ? false : undefined,
  tanstackStart: {
    server: { entry: "server" },
  },
  plugins: isVercelBuild ? [nitro()] : [],
});
