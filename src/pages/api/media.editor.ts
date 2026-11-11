import type { NextApiRequest, NextApiResponse } from "next";
import { allowEditor } from "../../server/local";
import { listMedia, maxImageBytes, saveImage } from "../../server/media";
import { editorApiError } from "../../server/operations";

export const config = { api: { bodyParser: false } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowEditor(req, res)) return;
  if (req.method !== "GET" && req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).end(); }
  try {
    if (req.method === "GET") return res.json(await listMedia(typeof req.query.query === "string" ? req.query.query.slice(0, 200) : ""));
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxImageBytes) return res.status(413).json({ error: "Dimensione massima: 10 MB." });
      chunks.push(Buffer.from(chunk));
    }
    const filename = typeof req.headers["x-file-name"] === "string" ? decodeURIComponent(req.headers["x-file-name"]).slice(0, 500) : "image";
    return res.status(201).json(await saveImage(Buffer.concat(chunks), filename));
  } catch (error) { return editorApiError(res, error, "Caricamento non riuscito. Riprova."); }
}
