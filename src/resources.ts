import type { DocumentName } from "./content";

export function stylesheetUrls(page: DocumentName) {
  return [
    "https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&family=JetBrains+Mono:wght@400;500;600&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
    "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css",
    ...["style", "sidebar", "font", "page-content", "animations", ...(page === "not-found" ? [] : ["accent-gradient"]), "theme-transition",
      "certifications", "error"].map(name => `/assets/css/${name}.css`),
  ];
}
export const initializeTheme = `try { if (localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark-mode"); } catch {}`;
