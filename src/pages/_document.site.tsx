import { Html, Head, Main, NextScript, type DocumentProps } from "next/document";
import { initializeTheme, stylesheetUrls } from "../resources";
import type { PageName } from "../content";

export default function Document({ __NEXT_DATA__ }: DocumentProps) {
  const page: PageName | undefined = __NEXT_DATA__.props.pageProps?.page;
  return <Html lang="en"><Head>
    {page && stylesheetUrls(page).map(href => <link key={href} rel="stylesheet" href={href} />)}
    <script dangerouslySetInnerHTML={{ __html: initializeTheme }} />
  </Head><body className={page === "overview" ? "page-about" : undefined}><Main /><NextScript /></body></Html>;
}
