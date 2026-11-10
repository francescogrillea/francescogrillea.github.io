import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { documentNames, validateDocument, type PageData } from "../src/content";
import { Intro, durationText } from "../src/components";

async function document(name: string): Promise<any> {
  return JSON.parse(await readFile(new URL(`../content/${name}.json`, import.meta.url), "utf8"));
}

test("all migrated documents validate with their fixed page structure", async () => {
  for (const name of documentNames) validateDocument(name, await document(name));
});

test("adding, editing, removing and reordering nested list entries is allowed", async () => {
  const data = await document("overview");
  const entries = data.content[1].props.items;
  entries.push({ title: "New experience", subtitle: "New role", start: "2026-01-01", end: "", details: [{ text: "First" }, { text: "Second" }] });
  entries.at(-1).details.reverse();
  entries.at(-1).details[0].text = "Edited";
  entries.splice(0, 1);
  entries.reverse();
  validateDocument("overview", data);
  data.content[1].props.items = [];
  data.content[2].props.items = [];
  validateDocument("overview", data);
});

test("section removal, reordering, new blocks and injected layout props are rejected", async () => {
  const original = await document("overview");
  const removed = structuredClone(original); removed.content.pop();
  assert.throws(() => validateDocument("overview", removed));
  const reordered = structuredClone(original); reordered.content.reverse();
  assert.throws(() => validateDocument("overview", reordered));
  const extra = structuredClone(original); extra.content.push({ type: "Heading", props: { id: "other", title: "Other" } });
  assert.throws(() => validateDocument("overview", extra));
  const styled = structuredClone(original); styled.content[0].props.style = { display: "none" };
  assert.throws(() => validateDocument("overview", styled));
  const zoned = structuredClone(original); zoned.zones = { arbitrary: [] };
  assert.throws(() => validateDocument("overview", zoned));
});

test("script links, protocol-relative links and unknown image paths are rejected", async () => {
  for (const href of ["javascript:alert(1)", "data:text/html,test", "//example.com", "/\\example.com"]) {
    const data = await document("global"); data.root.props.contacts[0].href = href;
    assert.throws(() => validateDocument("global", data));
  }
  const data = await document("global"); data.root.props.portrait.src = "/assets/../private.png";
  assert.throws(() => validateDocument("global", data));
});

test("education accepts empty lists and additional rows of certificates", async () => {
  const data = await document("education");
  const section = data.content[1].props;
  section.certifications = Array.from({ length: 20 }, (_, i) => ({ ...section.certifications[0], title: `Certificate ${i}` }));
  validateDocument("education", data);
  section.degrees = []; section.certifications = [];
  validateDocument("education", data);
});

test("plain text is escaped by the shared React components", () => {
  const html = renderToStaticMarkup(createElement(Intro, { title: "<script>alert(1)</script>", description: "<b>Text</b>" }));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
});

test("experience durations preserve calendar-month behavior", () => {
  assert.equal(durationText("2024-09-01", "", new Date("2026-11-10T12:00:00Z")), " (2 years, 2 months)");
  assert.equal(durationText("2022-09-01", "2024-07-01"), " (1 year, 10 months)");
  assert.equal(durationText("2026-01-15", "2026-02-14"), "");
  assert.equal(durationText("", ""), "");
});
