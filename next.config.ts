import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // pdfjs-dist resolves its worker file (pdf.worker.mjs) relative to its own
  // location in node_modules at runtime. If Next.js bundles it into a server
  // chunk, that relative path breaks ("Cannot find module ...pdf.worker.mjs"),
  // so keep it external and loaded via plain Node require/import instead.
  serverExternalPackages: ["pdfjs-dist"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
