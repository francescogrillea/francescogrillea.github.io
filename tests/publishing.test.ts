import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, writeFile, rm, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { documentNames, type GlobalData, type PageData } from "../src/content";
import { readDocument, writeDocument } from "../src/server/content";
import { ensureDraftStore, storagePaths } from "../src/server/storage";
import { listMedia, readUpload, saveImage } from "../src/server/media";
import { capturePublication, publishSnapshot } from "../src/server/publish";
import { withEditorOperation } from "../src/server/operations";
import { allowEditor } from "../src/server/local";

const execute = promisify(execFile);
const project = process.cwd();
let fixture: string;
const previousData = process.env.EDITOR_DATA_DIR;
before(async () => {
  fixture = await mkdtemp(path.join(os.tmpdir(), "portfolio-tests-"));
  process.env.EDITOR_DATA_DIR = path.join(fixture, "data");
});
after(async () => {
  if (previousData === undefined) delete process.env.EDITOR_DATA_DIR; else process.env.EDITOR_DATA_DIR = previousData;
  if (path.dirname(fixture) === path.resolve(os.tmpdir()) && path.basename(fixture).startsWith("portfolio-tests-")) await rm(fixture, { recursive: true, force: true });
});
async function git(args: string[], cwd = fixture) {
  return (await execute("git", ["-c", "core.autocrlf=false", ...args], { cwd, windowsHide: true })).stdout.trim();
}

test("saved drafts are isolated from published files and survive a new process", async () => {
  const published = await readFile(path.join(project, "content/global.json"), "utf8");
  await ensureDraftStore();
  const draft = await readDocument("global") as GlobalData;
  draft.root.props!.role = "Saved draft role";
  await writeDocument("global", draft);
  assert.equal(await readFile(path.join(project, "content/global.json"), "utf8"), published);
  assert.equal((await readDocument("global") as GlobalData).root.props!.role, "Saved draft role");
  const code = "require('./src/server/content.ts').readDocument('global').then(data=>process.stdout.write(data.root.props.role))";
  const restarted = await execute(process.execPath, ["--import", "tsx", "-e", code], { cwd: project, env: process.env, windowsHide: true });
  assert.equal(restarted.stdout, "Saved draft role");
});

test("invalid saves preserve the previous draft and unsafe image paths are rejected", async () => {
  const before = await readFile(path.join(storagePaths().content, "global.json"));
  const bad = await readDocument("global") as GlobalData;
  bad.root.props!.portrait.src = "javascript:alert(1)";
  await assert.rejects(writeDocument("global", bad));
  assert.deepEqual(await readFile(path.join(storagePaths().content, "global.json")), before);
  await assert.rejects(readUpload("../../secret.txt"));
  await assert.rejects(saveImage(Buffer.from("not an image"), "invalid.png"));
});

test("snapshot includes all saved pages and only referenced uploads", async () => {
  const image = await readFile(path.join(project, "public/assets/imgs/profile.png"));
  const referenced = await saveImage(image, "referenced.png");
  const unused = await saveImage(image, "unused.png");
  const draft = await readDocument("global") as GlobalData;
  draft.root.props!.portrait.src = referenced.src;
  await writeDocument("global", draft);
  const research = await readDocument("research") as PageData;
  (research.content[0].props as { title: string }).title = "Saved research draft";
  research.content.reverse();
  research.content.push({ type: "Heading", props: { id: "Heading-new-puck-id", title: "New section" } });
  await writeDocument("research", research);
  assert.deepEqual(await readUpload(path.basename(referenced.src)), image);
  assert.ok((await listMedia("referenced")).some(item => item.src === referenced.src));
  const snapshot = await capturePublication();
  assert.deepEqual(Object.keys(snapshot.documents).sort(), [...documentNames].sort());
  assert.ok(snapshot.uploads.has(path.basename(referenced.src)));
  assert.ok(!snapshot.uploads.has(path.basename(unused.src)));
});

async function createRemote(name: string) {
  const remote = path.join(fixture, `${name}.git`);
  const source = path.join(fixture, `${name}-source`);
  await git(["init", "--bare", "--initial-branch=main", remote]);
  await mkdir(source);
  await git(["init", "--initial-branch=main"], source);
  await git(["config", "user.name", "Publisher test"], source);
  await git(["config", "user.email", "test@example.invalid"], source);
  await mkdir(path.join(source, "content"));
  for (const document of documentNames) await writeFile(path.join(source, "content", `${document}.json`), await readFile(path.join(project, "content", `${document}.json`)));
  await writeFile(path.join(source, "code.ts"), "developer code v1\n");
  await git(["add", "."], source);
  await git(["commit", "-m", "Initial fixture"], source);
  await git(["remote", "add", "origin", remote], source);
  await git(["push", "-u", "origin", "main"], source);
  return { remote, source };
}

test("one Git publication preserves newer developer code and repeat publication is a no-op", async () => {
  const { remote, source } = await createRemote("success");
  await writeFile(path.join(source, "code.ts"), "newer developer code v2\n");
  await git(["add", "code.ts"], source);
  await git(["commit", "-m", "Developer update"], source);
  await git(["push"], source);
  const before = Number(await git(["--git-dir", remote, "rev-list", "--count", "main"]));
  const snapshot = await capturePublication();
  const target = { repository: remote, branch: "main" };
  const result = await publishSnapshot(snapshot, target);
  assert.equal(result.submitted, true);
  assert.equal(await git(["--git-dir", remote, "show", "main:code.ts"]), "newer developer code v2");
  assert.equal(Number(await git(["--git-dir", remote, "rev-list", "--count", "main"])), before + 1);
  for (const name of documentNames) assert.deepEqual(JSON.parse(await git(["--git-dir", remote, "show", `main:content/${name}.json`])), snapshot.documents[name]);
  for (const filename of snapshot.uploads.keys()) assert.ok((await git(["--git-dir", remote, "ls-tree", "-r", "--name-only", "main"])).includes(`public/assets/uploads/${filename}`));
  const changed = (await git(["--git-dir", remote, "diff-tree", "--no-commit-id", "--name-only", "-r", "main"])).split("\n");
  assert.ok(changed.every(file => file.startsWith("content/") || file.startsWith("public/assets/uploads/")));
  const repeat = await publishSnapshot(snapshot, target);
  assert.equal(repeat.submitted, false);
  assert.equal(repeat.commit, result.commit);
});

test("a rejected push preserves drafts, redacts Git errors and allows a clean retry", async () => {
  const { remote } = await createRemote("failure");
  const hook = path.join(remote, "hooks", "pre-receive");
  await writeFile(hook, "#!/bin/sh\necho 'remote secret should not leak' >&2\nexit 1\n");
  await chmod(hook, 0o755);
  const before = await readFile(path.join(storagePaths().content, "global.json"));
  const oldHead = await git(["--git-dir", remote, "rev-parse", "main"]);
  const snapshot = await capturePublication();
  const target = { repository: remote, branch: "main" };
  await assert.rejects(publishSnapshot(snapshot, target), error => {
    assert.ok(error instanceof Error);
    assert.ok(!error.message.includes("remote secret"));
    return true;
  });
  assert.equal(await git(["--git-dir", remote, "rev-parse", "main"]), oldHead);
  assert.deepEqual(await readFile(path.join(storagePaths().content, "global.json")), before);
  await rm(hook);
  assert.equal((await publishSnapshot(snapshot, target)).submitted, true);
});

test("publication lock prevents simultaneous publishing or saves and is released after errors", async () => {
  let release!: () => void;
  const pending = withEditorOperation(() => new Promise<void>(resolve => { release = resolve; }));
  await assert.rejects(withEditorOperation(async () => {}), error => (error as { status: number }).status === 409);
  await assert.rejects(writeDocument("global", await readDocument("global")), error => (error as { status: number }).status === 409);
  release(); await pending;
  await assert.rejects(withEditorOperation(async () => { throw new Error("Expected failure"); }));
  await withEditorOperation(async () => {});
});

test("Git obtains its technical credential through askpass without a token in argv", async () => {
  const fill = execute("git", ["-c", "credential.helper=", "credential", "fill"], {
    cwd: project, timeout: 15000, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: path.join(project, "scripts/git-askpass.cjs"), GITHUB_TOKEN: "test-credential-only" },
  });
  fill.child.stdin!.end("protocol=https\nhost=github.com\n\n");
  const { stdout } = await fill;
  assert.ok(stdout.includes("username=x-access-token"));
  assert.ok(stdout.includes("password=test-credential-only"));
});

test("production origin accepts the configured HTTPS host and rejects other origins", () => {
  const originalMode = process.env.PORTFOLIO_MODE;
  const originalOrigin = process.env.EDITOR_ORIGIN;
  process.env.PORTFOLIO_MODE = "editor"; process.env.EDITOR_ORIGIN = "https://editor.example.com";
  function check(headers: Record<string, string>) {
    let status = 200;
    const res = { status(code: number) { status = code; return this; }, json() {}, end() {}, setHeader() {} } as unknown as NextApiResponse;
    const allowed = allowEditor({ headers } as NextApiRequest, res);
    return { allowed, status };
  }
  try {
    assert.deepEqual(check({ host: "editor.example.com", origin: "https://editor.example.com" }), { allowed: true, status: 200 });
    assert.deepEqual(check({ host: "editor.example.com", origin: "https://other.example.com" }), { allowed: false, status: 403 });
    assert.deepEqual(check({ host: "127.0.0.1:12011" }), { allowed: false, status: 404 });
    process.env.PORTFOLIO_MODE = "site";
    assert.deepEqual(check({ host: "editor.example.com" }), { allowed: false, status: 404 });
  } finally {
    if (originalMode === undefined) delete process.env.PORTFOLIO_MODE; else process.env.PORTFOLIO_MODE = originalMode;
    if (originalOrigin === undefined) delete process.env.EDITOR_ORIGIN; else process.env.EDITOR_ORIGIN = originalOrigin;
  }
});
