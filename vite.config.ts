import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const isVercelBuild = process.env.VERCEL === "1";
const isNetlifyBuild = process.env.NETLIFY === "true";

export default defineConfig({
  cloudflare: isVercelBuild || isNetlifyBuild ? false : undefined,
  tanstackStart: {
    server: { entry: "server" },
  },
  plugins: isVercelBuild
    ? [nitro({ preset: "vercel", vercel: { entryFormat: "node" } })]
    : isNetlifyBuild
      ? [nitro({ preset: "netlify" })]
      : [],
});
