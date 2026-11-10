import type { NextApiRequest, NextApiResponse } from "next";
import { isDocumentName } from "../../content";
import { readDocument, writeDocument } from "../../server/content";
import { allowEditor } from "../../server/local";
import { editorApiError } from "../../server/operations";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowEditor(req, res)) return;
  const name = req.query.document;
  if (!isDocumentName(name)) return res.status(400).json({ error: "Documento non valido." });
  try {
    if (req.method === "GET") return res.json(await readDocument(name));
    if (req.method !== "PUT") { res.setHeader("Allow", "GET, PUT"); return res.status(405).end(); }
    await writeDocument(name, req.body);
    return res.json({ saved: true });
  } catch (error) { return editorApiError(res, error, "Salvataggio non riuscito. La bozza precedente è stata conservata."); }
}
