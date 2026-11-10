import dynamic from "next/dynamic";
import Head from "next/head";
import "@puckeditor/core/puck.css";

const Editor = dynamic(() => import("../Editor"), { ssr: false, loading: () => <p>Caricamento editor…</p> });
export default function EditPage() {
  return <><Head><title>Editor locale — Francesco Grillea</title><meta name="robots" content="noindex,nofollow" /></Head><Editor /></>;
}
