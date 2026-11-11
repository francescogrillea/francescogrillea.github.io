import type { DocumentName } from "./content";

export function stylesheetUrls(page: DocumentName) {
  return [
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
    "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css",
    ...["style", "sidebar", "font", "page-content", "animations", ...(page === "not-found" ? [] : ["accent-gradient"]), "theme-transition",
      "certifications", "error"].map(name => `/assets/css/${name}.css`),
  ];
}
export const initializeTheme = `try { if (localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark-mode"); } catch {}`;
