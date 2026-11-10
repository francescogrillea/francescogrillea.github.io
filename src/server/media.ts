import { readdir, mkdir, writeFile, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { documentNames } from "../content";
import { documentPath } from "./content";

export const maxImageBytes = 10 * 1024 * 1024;
export type MediaItem = { src: string; name: string };
const assets = path.join(process.cwd(), "public", "assets");
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

export async function listMedia(query = ""): Promise<MediaItem[]> {
  const entries: MediaItem[] = [{ src: "", name: "Nessuna immagine" }];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
        const relative = path.relative(assets, file).split(path.sep).join("/");
        entries.push({ src: `/assets/${relative}`, name: relative });
      }
    }
  }
  await visit(assets);
  // Preserve the existing remote logos as selectable image choices as well.
  function remoteImages(value: unknown) {
    if (!value || typeof value !== "object") return;
    if ("src" in value && typeof value.src === "string" && /^https?:\/\//.test(value.src) && !entries.some(item => item.src === value.src)) {
      entries.push({ src: value.src, name: value.src.split("/").pop() || value.src });
    }
    Object.values(value).forEach(remoteImages);
  }
  for (const name of documentNames) remoteImages(JSON.parse(await readFile(documentPath(name), "utf8")));
  return entries.filter(item => !item.src || item.name.toLowerCase().includes(query.toLowerCase()));
}

export async function saveImage(buffer: Buffer, originalName: string): Promise<MediaItem> {
  if (!buffer.length || buffer.length > maxImageBytes) throw new Error("L'immagine deve essere compresa fra 1 byte e 10 MB.");
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type.mime)) throw new Error("Carica un'immagine PNG, JPEG, WebP o GIF valida.");
  const uploads = path.join(assets, "uploads");
  await mkdir(uploads, { recursive: true });
  if ((await lstat(uploads)).isSymbolicLink()) throw new Error("Cartella upload non valida.");
  const base = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "image";
  const filename = `${base}-${randomUUID()}.${type.ext}`;
  await writeFile(path.join(uploads, filename), buffer, { flag: "wx" });
  return { src: `/assets/uploads/${filename}`, name: filename };
}
