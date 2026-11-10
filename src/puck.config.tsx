import type { Config, Fields, Field, ObjectField, ArrayField } from "@puckeditor/core";
import icons from "./icons.json";
import { lockedPermissions, type Blocks, type GlobalContent, type ImageContent, type PageName, type PageRoot } from "./content";
import { Education, ErrorPage, Heading, Intro, Projects, Research, SiteShell, Technologies, Timeline } from "./components";

const text = (label: string): Field => ({ type: "text", label });
const textarea = (label: string): Field => ({ type: "textarea", label });
const emptyImage = { src: "", alt: "" };
const emptyIcon = { icon: "devicon-python-plain", label: "Python", image: emptyImage };

// Puck supplies the searchable modal, selection, previews and clear action.
// Only fetchList connects it to this repository's images.
const imageFields = {
  src: {
    type: "external", label: "Immagine", placeholder: "Scegli un’immagine", showSearch: true,
    cache: { enabled: false },
    fetchList: async ({ query }) => {
      const response = await fetch(`/api/media?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Impossibile caricare le immagini.");
      return response.json();
    },
    mapProp: (item: { src: string }) => item.src,
    mapRow: (item: { src: string; name: string }) => ({ Anteprima: item.src ? <img src={item.src} alt="" width={56} height={40} style={{ objectFit: "contain" }} /> : "—", Nome: item.name }),
    getItemSummary: (src: string) => src ? src.split("/").pop() : "Nessuna immagine",
  },
  alt: text("Testo alternativo"),
} satisfies Fields<ImageContent>;
const imageField = { type: "object", label: "Immagine", objectFields: imageFields } satisfies ObjectField<ImageContent>;
const iconFields = {
  icon: { type: "select", label: "Icona", options: [
    ...Object.entries(icons).map(([value, item]) => ({ label: item.label, value })),
    { label: "Immagine dalla libreria", value: "image" },
  ] },
  label: text("Etichetta"), image: imageField,
} satisfies Fields<Blocks["Technologies"]["items"][number]>;
const iconField = { type: "object", label: "Icona o immagine", objectFields: iconFields } satisfies ObjectField<Blocks["Technologies"]["items"][number]>;
const lineField = { type: "array", label: "Righe", arrayFields: { text: textarea("Testo") }, defaultItemProps: { text: "" }, getItemSummary: item => item.text || "Nuova riga" } satisfies ArrayField<{ text: string }[]>;
const titleFields = { title: text("Titolo") };

const components: Config<Blocks, PageRoot>["components"] = {
  Heading: { label: "Titolo", fields: titleFields, render: Heading },
  Intro: { label: "Presentazione", fields: { ...titleFields, description: textarea("Presentazione") }, render: Intro },
  Timeline: {
    label: "Esperienze", fields: { ...titleFields, items: {
      type: "array", label: "Esperienze e formazione", arrayFields: {
        ...titleFields, subtitle: text("Sottotitolo e periodo"), start: text("Inizio (YYYY-MM-DD)"), end: text("Fine (vuoto = oggi)"), details: { ...lineField, label: "Dettagli" },
      }, defaultItemProps: { title: "Nuova esperienza", subtitle: "", start: "", end: "", details: [] }, getItemSummary: item => item.title || "Esperienza",
    } }, render: Timeline,
  },
  Technologies: {
    label: "Tecnologie", fields: { ...titleFields, items: { type: "array", label: "Tecnologie", arrayFields: iconFields,
      defaultItemProps: emptyIcon, getItemSummary: item => item.label || "Tecnologia" } }, render: Technologies,
  },
  Research: {
    label: "Ricerche", fields: { items: { type: "array", label: "Ricerche", arrayFields: {
      ...titleFields, description: textarea("Descrizione"), href: text("Link"), icon: iconField,
    }, defaultItemProps: { title: "Nuova ricerca", description: "", href: "", icon: { ...emptyIcon, icon: "fab fa-github" } }, getItemSummary: item => item.title || "Ricerca" } }, render: Research,
  },
  Projects: {
    label: "Progetti", fields: { items: { type: "array", label: "Progetti", arrayFields: {
      ...titleFields, description: textarea("Descrizione"), technologies: { type: "array", label: "Tecnologie", arrayFields: iconFields, defaultItemProps: emptyIcon, getItemSummary: item => item.label || "Tecnologia" },
    }, defaultItemProps: { title: "Nuovo progetto", description: "", technologies: [] }, getItemSummary: item => item.title || "Progetto" } }, render: Projects,
  },
  Education: {
    label: "Formazione", fields: {
      degrees: { type: "array", label: "Titoli di studio", arrayFields: {
        image: imageField, institution: text("Istituzione e anno"), ...titleFields, grade: text("Voto"),
      }, defaultItemProps: { image: emptyImage, institution: "", title: "Nuovo titolo di studio", grade: "" }, getItemSummary: item => item.title || "Titolo di studio" },
      certificationsTitle: text("Titolo delle certificazioni"),
      certifications: { type: "array", label: "Certificazioni e corsi", arrayFields: {
        ...titleFields, issuer: text("Ente"), year: text("Anno"), icon: iconField,
      }, defaultItemProps: { title: "Nuova certificazione", issuer: "", year: "", icon: { ...emptyIcon, icon: "image" } }, getItemSummary: item => item.title || "Certificazione" },
    }, render: Education,
  },
  ErrorPage: {
    label: "Pagina 404", fields: {
      emoji: text("Simbolo"), code: text("Codice"), ...titleFields, description: { ...lineField, label: "Descrizione" },
      homeLabel: text("Pulsante Home"), projectsLabel: text("Pulsante Projects"),
      contactPrefix: text("Testo prima del contatto"), contactLabel: text("Testo del link"), contactHref: text("Link del contatto"), contactSuffix: text("Testo dopo il contatto"),
    }, render: ErrorPage,
  },
};
// Defense in depth: individual components are also locked in the shared config.
for (const component of Object.values(components)) component.permissions = lockedPermissions;

export function pageConfig(global: GlobalContent, page: PageName): Config<Blocks, PageRoot> {
  return {
    categories: { other: { visible: false } }, components,
    root: { label: "Pagina", fields: { documentTitle: text("Titolo della scheda browser") },
      render: ({ children }) => <SiteShell value={global} page={page}>{children}</SiteShell> },
  };
}

export const globalConfig: Config<{}, GlobalContent> = {
  components: {},
  root: {
    label: "Header e profilo", fields: {
      name: text("Nome (header e profilo)"), role: text("Ruolo"), portrait: imageField,
      contacts: { type: "array", label: "Contatti", arrayFields: { label: text("Etichetta"), value: text("Testo"), href: text("Link (facoltativo)") },
        defaultItemProps: { label: "", value: "", href: "" }, getItemSummary: item => item.label || "Contatto" },
      socials: { type: "array", label: "Link social", arrayFields: { label: text("Nome"), href: text("Link"), icon: iconField },
        defaultItemProps: { label: "", href: "", icon: { ...emptyIcon, icon: "fab fa-github" } }, getItemSummary: item => item.label || "Social" },
      navigation: { type: "object", label: "Etichette del menu", objectFields: { overview: text("Overview"), research: text("Research"), projects: text("Projects"), education: text("Education") } },
      themeLabel: text("Etichetta accessibile del pulsante tema"),
    },
    render: props => <SiteShell value={props as unknown as GlobalContent} page="overview"><h1 className="is-visible">{props.name}</h1><p className="is-visible">{props.role}</p></SiteShell>,
  },
};
