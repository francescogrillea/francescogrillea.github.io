import type { NextApiRequest, NextApiResponse } from "next";
import { allowLocalEditor } from "../../server/local";
import { listMedia, maxImageBytes, saveImage } from "../../server/media";

export const config = { api: { bodyParser: false } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowLocalEditor(req, res)) return;
  if (req.method === "GET") {
    try { return res.json(await listMedia(typeof req.query.query === "string" ? req.query.query.slice(0, 200) : "")); }
    catch (error) { console.error(error); return res.status(500).json({ error: "Impossibile leggere le immagini." }); }
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).end(); }
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxImageBytes) return res.status(413).json({ error: "Dimensione massima: 10 MB." });
      chunks.push(Buffer.from(chunk));
    }
    const filename = typeof req.headers["x-file-name"] === "string" ? decodeURIComponent(req.headers["x-file-name"]).slice(0, 500) : "image";
    return res.status(201).json(await saveImage(Buffer.concat(chunks), filename));
  } catch (error) {
    if (error instanceof Error && !("code" in error)) return res.status(400).json({ error: error.message });
    console.error(error); return res.status(500).json({ error: "Caricamento non riuscito. Riprova." });
  }
}
