import type { NextApiRequest, NextApiResponse } from "next";
import { allowEditor } from "../../server/local";
import { publishDrafts } from "../../server/publish";
import { editorApiError } from "../../server/operations";

export const config = { api: { bodyParser: false } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowEditor(req, res)) return;
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  try { return res.json(await publishDrafts()); }
  catch (error) { return editorApiError(res, error, "Pubblicazione non riuscita. Le bozze sono conservate."); }
}
