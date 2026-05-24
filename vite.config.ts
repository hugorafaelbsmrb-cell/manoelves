import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

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
      ? [netlify()]
      : [],
});
