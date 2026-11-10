import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { validateDocument, type DocumentName, type GlobalData, type PageData, type PageName, type SiteDocument } from "../content";
import { ensureDraftStore, storagePaths } from "./storage";
import { withEditorOperation } from "./operations";

export async function readDocument(name: DocumentName): Promise<SiteDocument> {
  await ensureDraftStore();
  return validateDocument(name, JSON.parse(await readFile(path.join(storagePaths().content, `${name}.json`), "utf8")));
}
export async function writeDocument(name: DocumentName, input: unknown) {
  return withEditorOperation(async () => {
    const data = validateDocument(name, input);
    await ensureDraftStore();
    const target = path.join(storagePaths().content, `${name}.json`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      await rename(temporary, target);
    } finally { await unlink(temporary).catch(() => {}); }
  });
}
// Site builds always read the published checkout, never the editor's draft volume.
export async function loadPage(page: PageName) {
  async function published(name: DocumentName) {
    return validateDocument(name, JSON.parse(await readFile(path.join(storagePaths().publishedContent, `${name}.json`), "utf8")));
  }
  const [data, shared] = await Promise.all([published(page) as Promise<PageData>, published("global") as Promise<GlobalData>]);
  return { props: { page, data, global: shared.root.props! } };
}
