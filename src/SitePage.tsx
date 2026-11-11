import Head from "next/head";
import { useEffect } from "react";
import { Render } from "@puckeditor/core/rsc";
import type { GlobalContent, PageData, PageName } from "./content";
import { pageConfig } from "./puck.config";

export type SitePageProps = { page: PageName; data: PageData; global: GlobalContent };
export default function SitePage({ page, data, global }: SitePageProps) {
  useEffect(() => {
    document.body.classList.toggle("page-about", page === "overview");
    function leave(event: MouseEvent) {
      const link = (event.target as Element).closest?.("a");
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || /^(#|mailto:|tel:)/.test(href) || link.origin !== location.origin) return;
      event.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(() => { location.href = link.href; }, 120);
    }
    document.addEventListener("click", leave);
    return () => { document.removeEventListener("click", leave); document.body.classList.remove("page-about", "is-leaving"); };
  }, [page]);
  return <><Head><title>{data.root.props?.documentTitle}</title>
  </Head><Render config={pageConfig(global, page)} data={data} /></>;
}
