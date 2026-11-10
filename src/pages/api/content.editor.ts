import type { NextApiRequest, NextApiResponse } from "next";
import { ZodError } from "zod";
import { isDocumentName } from "../../content";
import { readDocument, writeDocument } from "../../server/content";
import { allowLocalEditor } from "../../server/local";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowLocalEditor(req, res)) return;
  const name = req.query.document;
  if (!isDocumentName(name)) return res.status(400).json({ error: "Documento non valido." });
  try {
    if (req.method === "GET") return res.json(await readDocument(name));
    if (req.method !== "PUT") { res.setHeader("Allow", "GET, PUT"); return res.status(405).end(); }
    await writeDocument(name, req.body);
    return res.json({ saved: true });
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ error: error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
    if (error instanceof Error && !('code' in error)) return res.status(400).json({ error: error.message });
    console.error("Content storage error:", error);
    return res.status(500).json({ error: "Salvataggio non riuscito. I contenuti precedenti sono stati conservati." });
  }
}
