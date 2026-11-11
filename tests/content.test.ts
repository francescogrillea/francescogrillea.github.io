import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Render } from "@puckeditor/core/rsc";
import { documentNames, validateDocument } from "../src/content";
import { pageConfig, globalConfig } from "../src/puck.config";
import { stylesheetUrls } from "../src/resources";
import { Intro, durationText } from "../src/components";

async function document(name: string): Promise<any> {
  return JSON.parse(await readFile(new URL(`../content/${name}.json`, import.meta.url), "utf8"));
}

test("all existing documents remain valid without migration", async () => {
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

test("sections can be removed, reordered, inserted and duplicated on every page", async () => {
  const global = (await document("global")).root.props;
  for (const name of documentNames) {
    if (name === "global") continue;
    const data = await document(name);
    const config = pageConfig(global, name);
    assert.equal(config.categories, undefined);
    data.content = Object.entries(config.components).map(([type, component]) => {
      assert.equal(component.permissions, undefined);
      return { type, props: { ...structuredClone(component.defaultProps), id: `${type}-generated-id` } };
    });
    assert.equal(data.content.length, 8);
    validateDocument(name, data);
    assert.ok(renderToStaticMarkup(createElement(Render, { config, data })).includes("Nuovo titolo"));
    const duplicates = structuredClone(data.content);
    for (const block of duplicates) block.props.id += "-duplicate";
    data.content.push(...duplicates);
    validateDocument(name, data);
    const html = renderToStaticMarkup(createElement(Render, { config, data }));
    const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(htmlIds).size, htmlIds.length, "Duplicated components must not repeat HTML identifiers");
    data.content.reverse();
    data.content.splice(1, 1);
    validateDocument(name, data);
    data.content = [];
    validateDocument(name, data);
    assert.ok(renderToStaticMarkup(createElement(Render, { config, data })).includes("<main"));
  }
  assert.deepEqual(globalConfig.components, {});
});

test("unknown components, invalid identifiers, injected props and unsupported zones are rejected", async () => {
  const original = await document("overview");
  for (const type of ["Unknown", "constructor", "__proto__"]) {
    const unknown = structuredClone(original); unknown.content[0].type = type;
    assert.throws(() => validateDocument("overview", unknown));
  }
  for (const id of [undefined, "", "   ", original.content[1].props.id]) {
    const invalid = structuredClone(original); invalid.content[0].props.id = id;
    assert.throws(() => validateDocument("overview", invalid));
  }
  const styled = structuredClone(original); styled.content[0].props.style = { display: "none" };
  assert.throws(() => validateDocument("overview", styled));
  const zoned = structuredClone(original); zoned.zones = { arbitrary: [] };
  assert.throws(() => validateDocument("overview", zoned));
  const global = await document("global"); global.content = original.content;
  assert.throws(() => validateDocument("global", global));
});

test("component styles and icon libraries are available on every page", () => {
  for (const name of documentNames) {
    const styles = stylesheetUrls(name);
    assert.ok(styles.includes("/assets/css/certifications.css"));
    assert.ok(styles.includes("/assets/css/error.css"));
    assert.ok(styles.some(url => url.includes("devicon")));
    assert.equal(styles.includes("/assets/css/accent-gradient.css"), name !== "not-found");
  }
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
