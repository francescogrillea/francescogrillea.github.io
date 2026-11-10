import { readdir, writeFile, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { documentNames } from "../content";
import { readDocument } from "./content";
import { ensureDraftStore, storagePaths } from "./storage";
import { EditorError, withEditorOperation } from "./operations";

export const maxImageBytes = 10 * 1024 * 1024;
export type MediaItem = { src: string; name: string };
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

export function uploadFilename(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,150}\.(png|jpe?g|webp|gif|svg)$/i.test(value)) throw new EditorError("Nome immagine non valido.");
  return value;
}
export async function readUpload(filename: string): Promise<Buffer> {
  await ensureDraftStore();
  const file = path.join(storagePaths().uploads, uploadFilename(filename));
  const info = await lstat(file);
  if (!info.isFile()) throw new EditorError("Immagine non disponibile.", 404);
  return readFile(file);
}

export async function listMedia(query = ""): Promise<MediaItem[]> {
  await ensureDraftStore();
  const paths = storagePaths();
  const entries: MediaItem[] = [{ src: "", name: "Nessuna immagine" }];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && file !== path.join(paths.assets, "uploads")) await visit(file);
      else if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
        const relative = path.relative(paths.assets, file).split(path.sep).join("/");
        entries.push({ src: `/assets/${relative}`, name: relative });
      }
    }
  }
  await visit(paths.assets);
  for (const item of await readdir(paths.uploads, { withFileTypes: true })) if (item.isFile() && supportedExtensions.has(path.extname(item.name).toLowerCase())) {
    entries.push({ src: `/assets/uploads/${item.name}`, name: `uploads/${item.name}` });
  }
  function remoteImages(value: unknown) {
    if (!value || typeof value !== "object") return;
    if ("src" in value && typeof value.src === "string" && /^https?:\/\//.test(value.src) && !entries.some(item => item.src === value.src)) entries.push({ src: value.src, name: value.src.split("/").pop() || value.src });
    Object.values(value).forEach(remoteImages);
  }
  for (const name of documentNames) remoteImages(await readDocument(name));
  return entries.filter(item => !item.src || item.name.toLowerCase().includes(query.toLowerCase()));
}

export async function saveImage(buffer: Buffer, originalName: string): Promise<MediaItem> {
  return withEditorOperation(async () => {
    if (!buffer.length || buffer.length > maxImageBytes) throw new EditorError("L'immagine deve essere compresa fra 1 byte e 10 MB.");
    const type = await fileTypeFromBuffer(buffer);
    if (!type || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type.mime)) throw new EditorError("Carica un'immagine PNG, JPEG, WebP o GIF valida.");
    await ensureDraftStore();
    const base = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "image";
    const filename = `${base}-${randomUUID()}.${type.ext}`;
    await writeFile(path.join(storagePaths().uploads, filename), buffer, { flag: "wx" });
    return { src: `/assets/uploads/${filename}`, name: filename };
  });
}
