import type { NextApiRequest, NextApiResponse } from "next";

export function allowLocalEditor(req: NextApiRequest, res: NextApiResponse): boolean {
  const host = req.headers.host;
  if (process.env.PORTFOLIO_MODE !== "editor" || !["127.0.0.1:3001", "localhost:3001"].includes(host || "")) {
    res.status(404).end(); return false;
  }
  if (req.headers["sec-fetch-site"] === "cross-site" || req.headers.origin && req.headers.origin !== `http://${host}`) {
    res.status(403).json({ error: "Richiesta consentita soltanto dall'editor locale." }); return false;
  }
  res.setHeader("Cache-Control", "no-store");
  return true;
}
