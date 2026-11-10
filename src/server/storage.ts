import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { documentNames } from "../content";

export function storagePaths() {
  const project = process.cwd();
  const data = path.resolve(process.env.EDITOR_DATA_DIR || path.join(project, ".editor-data"));
  return {
    data, content: path.join(data, "content"), uploads: path.join(data, "uploads"),
    publishedContent: path.join(project, "content"), assets: path.join(project, "public", "assets"),
  };
}

const initialization = new Map<string, Promise<void>>();
async function copyIfMissing(source: string, destination: string) {
  await copyFile(source, destination, constants.COPYFILE_EXCL).catch(error => {
    if (error.code !== "EEXIST") throw error;
  });
}

export async function ensureDraftStore(): Promise<void> {
  const paths = storagePaths();
  if (!initialization.has(paths.data)) {
    const pending = (async () => {
      const marker = path.join(paths.data, ".initialized");
      try { await readFile(marker); return; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      await mkdir(paths.content, { recursive: true });
      await mkdir(paths.uploads, { recursive: true });
      // COPYFILE_EXCL also preserves completed files if the first boot was interrupted.
      for (const name of documentNames) await copyIfMissing(path.join(paths.publishedContent, `${name}.json`), path.join(paths.content, `${name}.json`));
      const publishedUploads = path.join(paths.assets, "uploads");
      const images = await readdir(publishedUploads, { withFileTypes: true }).catch(error => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
      for (const image of images) if (image.isFile()) await copyIfMissing(path.join(publishedUploads, image.name), path.join(paths.uploads, image.name));
      await writeFile(marker, "Draft storage initialized. Do not remove when updating the application.\n", { flag: "wx" }).catch(error => {
        if (error.code !== "EEXIST") throw error;
      });
    })();
    initialization.set(paths.data, pending);
    pending.catch(() => initialization.delete(paths.data));
  }
  await initialization.get(paths.data);
}
