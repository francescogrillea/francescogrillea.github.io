import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { validateDocument, type DocumentName, type GlobalData, type PageData, type PageName, type SiteDocument } from "../content";

export function documentPath(name: DocumentName) { return path.join(process.cwd(), "content", `${name}.json`); }
export async function readDocument(name: DocumentName): Promise<SiteDocument> {
  return validateDocument(name, JSON.parse(await readFile(documentPath(name), "utf8")));
}
export async function writeDocument(name: DocumentName, input: unknown) {
  const data = validateDocument(name, input);
  const target = documentPath(name);
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporary, target);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
export async function loadPage(page: PageName) {
  const [data, shared] = await Promise.all([readDocument(page) as Promise<PageData>, readDocument("global") as Promise<GlobalData>]);
  return { props: { page, data, global: shared.root.props! } };
}
