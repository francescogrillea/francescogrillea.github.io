import type { NextApiRequest, NextApiResponse } from "next";

export function allowEditor(req: NextApiRequest, res: NextApiResponse): boolean {
  if (process.env.PORTFOLIO_MODE !== "editor") { res.status(404).end(); return false; }
  const configured = process.env.EDITOR_ORIGIN || "http://127.0.0.1:12011";
  let origin: URL;
  try { origin = new URL(configured); }
  catch { res.status(503).json({ error: "EDITOR_ORIGIN non valido." }); return false; }
  if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== configured || origin.username || origin.password) {
    res.status(503).json({ error: "EDITOR_ORIGIN deve contenere soltanto schema e dominio, senza slash finale." }); return false;
  }
  const hosts = process.env.EDITOR_ORIGIN ? [origin.host] : ["127.0.0.1:12011", "localhost:12011"];
  if (!hosts.includes(req.headers.host || "")) { res.status(404).end(); return false; }
  const allowedOrigins = process.env.EDITOR_ORIGIN ? [origin.origin] : hosts.map(host => `http://${host}`);
  if (req.headers["sec-fetch-site"] === "cross-site" || req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
    res.status(403).json({ error: "Richiesta consentita soltanto dall'origine configurata per l'editor." }); return false;
  }
  res.setHeader("Cache-Control", "no-store");
  return true;
}
