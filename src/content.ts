import { z } from "zod";
import type { Data } from "@puckeditor/core";
import icons from "./icons.json";

export const documentNames = ["global", "overview", "research", "projects", "education", "not-found"] as const;
export type DocumentName = typeof documentNames[number];
export type PageName = Exclude<DocumentName, "global">;
export const pageLabels: Record<DocumentName, string> = {
  global: "Header e profilo", overview: "Overview", research: "Research",
  projects: "Projects", education: "Education", "not-found": "Pagina 404",
};
export const navigation = [
  { key: "overview", href: "/index.html" }, { key: "research", href: "/research.html" },
  { key: "projects", href: "/projects.html" }, { key: "education", href: "/education.html" },
] as const;

const text = z.string().max(30000);
// Content is rendered as React text, never as HTML. Only explicit link schemes are accepted.
export const linkSchema = z.string().max(2000).refine(value =>
  value === "" || /^(https?:\/\/|mailto:|tel:)/i.test(value) || /^\/(?!\/)[^\\\x00-\x20]*$/.test(value),
  "Usa un URL http/https, mailto:, tel: o un percorso assoluto locale.");
const imageSource = z.string().max(2000).refine(value =>
  value === "" || /^https?:\/\//i.test(value) || /^\/assets\/(?!.*(?:\.\.|[\\\x00-\x20]))/.test(value),
  "Immagine non valida.");
export const imageSchema = z.object({ src: imageSource, alt: text }).strict();
export const iconSchema = z.object({
  icon: z.enum(["image", ...Object.keys(icons)] as [string, ...string[]]),
  label: text, image: imageSchema,
}).strict();
const lines = z.array(z.object({ text }).strict()).max(500);
const date = z.string().refine(value => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)), "Usa YYYY-MM-DD.");
export const globalSchema = z.object({
  name: text, role: text, portrait: imageSchema,
  contacts: z.array(z.object({ label: text, value: text, href: linkSchema }).strict()).max(100),
  socials: z.array(z.object({ label: text, href: linkSchema, icon: iconSchema }).strict()).max(100),
  navigation: z.object({ overview: text, research: text, projects: text, education: text }).strict(),
  themeLabel: text,
}).strict();
export const blockSchemas = {
  Heading: z.object({ title: text }).strict(),
  Intro: z.object({ title: text, description: text }).strict(),
  Timeline: z.object({ title: text, items: z.array(z.object({
    title: text, subtitle: text, start: date, end: date, details: lines,
  }).strict().refine(item => !item.start || !item.end || item.end >= item.start, "La fine deve seguire l’inizio.")).max(500) }).strict(),
  Technologies: z.object({ title: text, items: z.array(iconSchema).max(500) }).strict(),
  Research: z.object({ items: z.array(z.object({ title: text, description: text, href: linkSchema, icon: iconSchema }).strict()).max(500) }).strict(),
  Projects: z.object({ items: z.array(z.object({ title: text, description: text, technologies: z.array(iconSchema).max(100) }).strict()).max(500) }).strict(),
  Education: z.object({
    degrees: z.array(z.object({ image: imageSchema, institution: text, title: text, grade: text }).strict()).max(500),
    certificationsTitle: text,
    certifications: z.array(z.object({ title: text, issuer: text, year: text, icon: iconSchema }).strict()).max(500),
  }).strict(),
  ErrorPage: z.object({
    emoji: text, code: text, title: text, description: lines, homeLabel: text, projectsLabel: text,
    contactPrefix: text, contactLabel: text, contactHref: linkSchema, contactSuffix: text,
  }).strict(),
};
export type Blocks = { [K in keyof typeof blockSchemas]: z.infer<typeof blockSchemas[K]> };
export type GlobalContent = z.infer<typeof globalSchema>;
export type IconContent = z.infer<typeof iconSchema>;
export type ImageContent = z.infer<typeof imageSchema>;
export type PageRoot = { documentTitle: string };
export type PageData = Data<Blocks, PageRoot>;
export type GlobalData = Data<{}, GlobalContent>;
export type SiteDocument = PageData | GlobalData;

export function isDocumentName(value: unknown): value is DocumentName {
  return typeof value === "string" && documentNames.includes(value as DocumentName);
}

export function validateDocument(name: DocumentName, value: unknown): SiteDocument {
  const envelope = z.object({
    root: z.object({ props: z.record(z.string(), z.unknown()), readOnly: z.record(z.string(), z.boolean()).optional() }).strict(),
    content: z.array(z.object({ type: z.string(), props: z.record(z.string(), z.unknown()), readOnly: z.record(z.string(), z.boolean()).optional() }).strict()),
    zones: z.record(z.string(), z.never()).optional(),
  }).strict().parse(value);
  if (name === "global") {
    if (envelope.content.length) throw new Error("La struttura globale non può cambiare.");
    globalSchema.parse(envelope.root.props);
  } else {
    z.object({ documentTitle: text }).strict().parse(envelope.root.props);
    const ids = new Set<string>();
    envelope.content.forEach(block => {
      const type = z.enum(Object.keys(blockSchemas) as [keyof Blocks, ...(keyof Blocks)[]]).parse(block.type);
      const { id, ...props } = block.props;
      const identifier = z.string().min(1).refine(value => value.trim() === value && !ids.has(value),
        "Gli identificatori delle sezioni devono essere univoci e senza spazi esterni.").parse(id);
      ids.add(identifier);
      blockSchemas[type].parse(props);
    });
  }
  return envelope as SiteDocument;
}
