import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @param {string} phase @returns {import('next').NextConfig} */
export default function config(phase) {
  const editor = process.env.PORTFOLIO_MODE === "editor";
  const development = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    pageExtensions: editor ? ["site.tsx", "editor.tsx", "editor.ts"] : ["site.tsx"],
    distDir: editor ? ".next-editor" : development ? ".next-site" : "out",
    ...(!development ? { output: editor ? "standalone" : "export" } : {}),
    devIndicators: false,
    agentRules: false,
    reactStrictMode: true,
    ...(editor ? { redirects: async () => [{ source: "/", destination: "/edit", permanent: false }] } : {}),
    ...((editor || development) ? { rewrites: async () => [
      // Runtime uploads do not depend on Next's startup-only public file index.
      ...(editor ? [{ source: "/assets/uploads/:name", destination: "/api/uploads/:name" }] : []),
      // The static export already emits the legacy HTML paths.
      ...(development ? [
        { source: "/index.html", destination: "/" },
        { source: "/:page(research|projects|education|404).html", destination: "/:page" },
      ] : []),
    ] } : {}),
  };
}
