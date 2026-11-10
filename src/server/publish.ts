import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { documentNames, type DocumentName, type SiteDocument } from "../content";
import { readDocument } from "./content";
import { readUpload, uploadFilename } from "./media";
import { EditorError, withEditorOperation } from "./operations";

const execute = promisify(execFile);
export type PublicationSnapshot = { documents: Record<DocumentName, SiteDocument>; uploads: Map<string, Buffer> };
export type PublicationTarget = { repository: string; branch: string; token?: string };
export type PublicationResult = { submitted: boolean; commit: string };

export async function capturePublication(): Promise<PublicationSnapshot> {
  const documents = Object.fromEntries(await Promise.all(documentNames.map(async name => [name, await readDocument(name)]))) as Record<DocumentName, SiteDocument>;
  const filenames = new Set<string>();
  function collect(value: unknown) {
    if (!value || typeof value !== "object") return;
    if ("src" in value && typeof value.src === "string" && value.src.startsWith("/assets/uploads/")) filenames.add(uploadFilename(value.src.slice("/assets/uploads/".length)));
    Object.values(value).forEach(collect);
  }
  Object.values(documents).forEach(collect);
  const uploads = new Map<string, Buffer>();
  for (const filename of filenames) {
    try { uploads.set(filename, await readUpload(filename)); }
    catch { throw new EditorError(`Immagine referenziata non disponibile: ${filename}. Controlla la bozza prima di pubblicare.`); }
  }
  return { documents, uploads };
}

export function publicationTarget(): PublicationTarget {
  const repository = process.env.GITHUB_REPOSITORY || "";
  const token = process.env.GITHUB_TOKEN;
  if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(repository) || !token) throw new EditorError("Configura GITHUB_REPOSITORY e GITHUB_TOKEN sul server dell'editor.", 503);
  return { repository: `https://github.com/${repository}.git`, branch: process.env.GITHUB_BRANCH || "main", token };
}

async function git(args: string[], cwd: string, target: PublicationTarget, allowDifference = false): Promise<{ stdout: string; different: boolean }> {
  try {
    const result = await execute("git", ["-c", "credential.helper=", "-c", "core.autocrlf=false", ...args], {
      cwd, timeout: 60000, maxBuffer: 1024 * 1024, windowsHide: true,
      env: { ...process.env, LC_ALL: "C", GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: path.join(process.cwd(), "scripts", "git-askpass.cjs"), GITHUB_TOKEN: target.token || "" },
    });
    return { stdout: result.stdout.trim(), different: false };
  } catch (error) {
    if (allowDifference && (error as { code?: number }).code === 1) return { stdout: "", different: true };
    // Never expose Git stderr, remote responses or credentials through the API/logs.
    throw new EditorError("Invio Git non confermato. Controlla configurazione e connessione, poi riprova. Le bozze sono conservate.", 502);
  }
}

async function writeRepositoryFile(repository: string, relative: string, data: string | Buffer) {
  const parts = relative.split("/");
  let directory = repository;
  for (const part of parts.slice(0, -1)) {
    directory = path.join(directory, part);
    await mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
    if (!(await lstat(directory)).isDirectory() || (await lstat(directory)).isSymbolicLink()) throw new EditorError("La struttura della repository non è compatibile con la pubblicazione.");
  }
  const file = path.join(directory, parts.at(-1)!);
  const existing = await lstat(file).catch(error => { if (error.code !== "ENOENT") throw error; return null; });
  if (existing && !existing.isFile()) throw new EditorError("La repository contiene un percorso contenuti non valido.");
  await writeFile(file, data);
}

// An isolated checkout lets Git handle commits and concurrent branch updates.
// The application never modifies code, force-pushes, or merges a developer checkout.
export async function publishSnapshot(snapshot: PublicationSnapshot, target: PublicationTarget): Promise<PublicationResult> {
  if (!target.branch || target.branch.startsWith("-")) throw new EditorError("GITHUB_BRANCH non valido.", 503);
  const temporary = await mkdtemp(path.join(os.tmpdir(), "portfolio-publish-"));
  try {
    await git(["check-ref-format", "--branch", target.branch], temporary, target);
    await git(["clone", "--depth", "1", "--single-branch", "--branch", target.branch, "--", target.repository, "checkout"], temporary, target);
    const repository = path.join(temporary, "checkout");
    const files: string[] = [];
    for (const name of documentNames) {
      const relative = `content/${name}.json`;
      await writeRepositoryFile(repository, relative, `${JSON.stringify(snapshot.documents[name], null, 2)}\n`);
      files.push(relative);
    }
    for (const [name, data] of snapshot.uploads) {
      const relative = `public/assets/uploads/${uploadFilename(name)}`;
      await writeRepositoryFile(repository, relative, data);
      files.push(relative);
    }
    await git(["add", "--", ...files], repository, target);
    const { different } = await git(["diff", "--cached", "--quiet"], repository, target, true);
    if (!different) return { submitted: false, commit: (await git(["rev-parse", "HEAD"], repository, target)).stdout };
    await git(["-c", "user.name=Portfolio Editor", "-c", "user.email=portfolio-editor@users.noreply.github.com", "commit", "-m", "Publish saved portfolio content"], repository, target);
    const commit = (await git(["rev-parse", "HEAD"], repository, target)).stdout;
    await git(["push", "origin", `HEAD:refs/heads/${target.branch}`], repository, target);
    return { submitted: true, commit };
  } finally {
    // Only remove the temporary directory created by this invocation.
    if (path.dirname(temporary) === path.resolve(os.tmpdir()) && path.basename(temporary).startsWith("portfolio-publish-")) await rm(temporary, { recursive: true, force: true });
  }
}

export async function publishDrafts() {
  return withEditorOperation(async () => {
    const target = publicationTarget();
    return publishSnapshot(await capturePublication(), target);
  });
}
