import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @param {string} phase @returns {import('next').NextConfig} */
export default function config(phase) {
  const editor = process.env.PORTFOLIO_MODE === "editor";
  const development = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    pageExtensions: editor ? ["site.tsx", "editor.tsx", "editor.ts"] : ["site.tsx"],
    distDir: editor ? ".next-editor" : development ? ".next-site" : "out",
    ...(!editor && !development ? { output: "export" } : {}),
    devIndicators: false,
    agentRules: false,
    reactStrictMode: true,
    // The export already emits these HTML files. Rewrites are only needed by next dev.
    ...(development ? { rewrites: async () => [
      { source: "/index.html", destination: "/" },
      { source: "/:page(research|projects|education|404).html", destination: "/:page" },
    ] } : {}),
  };
}
