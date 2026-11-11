import type { NextApiRequest, NextApiResponse } from "next";
import path from "node:path";
import { allowEditor } from "../../../server/local";
import { readUpload } from "../../../server/media";
import { editorApiError } from "../../../server/operations";

const types: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowEditor(req, res)) return;
  if (req.method !== "GET" && req.method !== "HEAD") { res.setHeader("Allow", "GET, HEAD"); return res.status(405).end(); }
  if (typeof req.query.name !== "string") return res.status(400).end();
  try {
    const data = await readUpload(req.query.name);
    res.setHeader("Content-Type", types[path.extname(req.query.name).toLowerCase()]);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return req.method === "HEAD" ? res.status(200).end() : res.send(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return res.status(404).end();
    return editorApiError(res, error, "Immagine non disponibile.");
  }
}
