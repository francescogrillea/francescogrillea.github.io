import type { NextApiResponse } from "next";
import { ZodError } from "zod";

export class EditorError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// All editor API bundles (and development reloads) share one write lock.
const state = globalThis as typeof globalThis & { portfolioEditorBusy?: boolean };
export async function withEditorOperation<T>(operation: () => Promise<T>): Promise<T> {
  if (state.portfolioEditorBusy) throw new EditorError("È già in corso un salvataggio o una pubblicazione. Riprova fra poco.", 409);
  state.portfolioEditorBusy = true;
  try { return await operation(); }
  finally { state.portfolioEditorBusy = false; }
}

export function editorApiError(res: NextApiResponse, error: unknown, fallback: string) {
  if (error instanceof ZodError) return res.status(400).json({ error: error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
  if (error instanceof EditorError) return res.status(error.status).json({ error: error.message });
  console.error(fallback, error instanceof Error ? error.message : "Errore sconosciuto");
  return res.status(500).json({ error: fallback });
}
