import { Puck, Button, createUsePuck, type Data, type Config } from "@puckeditor/core";
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { documentNames, isDocumentName, pageLabels, type DocumentName, type GlobalData, type SiteDocument } from "./content";
import { globalConfig, pageConfig } from "./puck.config";
import { initializeTheme, stylesheetUrls } from "./resources";

function PreviewFrame({ children, document: doc, page }: { children: ReactNode; document?: Document; page: DocumentName }) {
  useEffect(() => {
    if (!doc) return;
    doc.documentElement.lang = "en";
    doc.body.classList.toggle("page-about", page === "overview" || page === "global");
    // Keep the site's CSS inside Puck's native iframe, away from editor controls.
    const links = stylesheetUrls(page).map(href => {
      const link = doc.createElement("link"); link.rel = "stylesheet"; link.href = href; doc.head.appendChild(link); return link;
    });
    const script = doc.createElement("script"); script.textContent = initializeTheme; doc.head.appendChild(script);
    // The native editor adds a drop-zone wrapper around the same components.
    // Mirror the original direct-child paragraph spacing inside that wrapper.
    const spacing = doc.createElement("style");
    // Puck may mount its wrapper after the site's staggered reveal effect has run.
    spacing.textContent = 'main > * { opacity: 1; transform: none; } body.page-about main .intro-description { margin-bottom: 3.5rem; }';
    doc.head.appendChild(spacing);
    const disableNavigation = (event: MouseEvent) => {
      if ((event.target as Element).closest?.("a")) event.preventDefault();
    };
    doc.addEventListener("click", disableNavigation);
    return () => { links.forEach(link => link.remove()); script.remove(); spacing.remove(); doc.removeEventListener("click", disableNavigation); };
  }, [doc, page]);
  return <>{children}</>;
}

function snapshot(data: Data) { return JSON.stringify({ ...data, zones: data.zones || {} }); }

const usePuck = createUsePuck();
type EditorActionsProps = {
  page: DocumentName;
  saving: boolean;
  publishing: boolean;
  uploading: boolean;
  dirty: boolean;
  error: string;
  status: string;
  changePage: (page: DocumentName) => void;
  upload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  save: (data: Data) => Promise<void>;
  publishSaved: () => Promise<void>;
};
// Keep the override's identity stable as status changes, preserving focus and file inputs.
const EditorActionsContext = createContext<EditorActionsProps | null>(null);
function EditorActions() {
  const actions = useContext(EditorActionsContext)!;
  const data = usePuck(state => state.appState.data);
  const { page, saving, uploading, publishing, dirty, error, status } = actions;
  const busy = saving || uploading || publishing;
  const message = error || (dirty && !busy ? "Modifiche non salvate: salva prima di pubblicare." : status);
  return <>
    <label>Pagina <select aria-label="Pagina da modificare" disabled={busy} value={page} onChange={event => actions.changePage(event.target.value as DocumentName)}>
      {documentNames.map(name => <option key={name} value={name}>{pageLabels[name]}</option>)}
    </select></label>
    <label style={{ fontSize: 12 }}>Carica immagine <input aria-label="Carica immagine" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={actions.upload} style={{ width: 170 }} /></label>
    <span role={error ? "alert" : "status"} style={{ fontSize: 12, minWidth: 180, maxWidth: 300, color: error ? "#b91c1c" : undefined }}>{message}</span>
    <Button disabled={busy} loading={saving} onClick={() => actions.save(data)}>Salva</Button>
    <Button variant="secondary" disabled={dirty || busy} loading={publishing} onClick={actions.publishSaved}>Pubblica</Button>
  </>;
}

export default function Editor() {
  const [page, setPage] = useState<DocumentName>("overview");
  const [loaded, setLoaded] = useState<{ page: DocumentName; data: SiteDocument; global: GlobalData } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const baseline = useRef("");
  const latest = useRef("");
  const operationPending = useRef(false);
  useEffect(() => {
    const selected = new URLSearchParams(location.search).get("page");
    if (isDocumentName(selected)) setPage(selected);
    document.documentElement.classList.remove("dark-mode");
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (latest.current !== baseline.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setError(""); setStatus("");
    Promise.all([fetch(`/api/content?document=${page}`), fetch("/api/content?document=global")])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw new Error("Impossibile caricare i contenuti.");
        const [data, global] = await Promise.all(responses.map(response => response.json()));
        if (cancelled) return;
        baseline.current = latest.current = snapshot(data);
        setDirty(false);
        setLoaded({ page, data, global });
      }).catch(cause => { if (!cancelled) setError(String(cause.message)); });
    return () => { cancelled = true; };
  }, [page]);

  const config = useMemo(() => !loaded ? null : loaded.page === "global"
    ? globalConfig : pageConfig(loaded.global.root.props!, loaded.page), [loaded]);
  const frame = useCallback((props: { children: ReactNode; document?: Document }) => <PreviewFrame {...props} page={page} />, [page]);

  async function save(data: Data) {
    if (operationPending.current) return;
    operationPending.current = true;
    // Capture exactly what is sent, even if editing continues during the request.
    const savedSnapshot = snapshot(data);
    setSaving(true); setError(""); setStatus("Salvataggio…");
    try {
      const response = await fetch(`/api/content?document=${page}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Salvataggio non riuscito.");
      baseline.current = savedSnapshot;
      setDirty(latest.current !== baseline.current);
      setStatus(latest.current === baseline.current ? "Bozza salvata. Premi Pubblica per aggiornare il sito." : "Bozza salvata. Restano modifiche da salvare.");
    } catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito."); }
    finally { operationPending.current = false; setSaving(false); }
  }
  async function publishSaved() {
    if (latest.current !== baseline.current || operationPending.current) return;
    operationPending.current = true;
    setPublishing(true); setError(""); setStatus("Invio dei contenuti salvati…");
    try {
      const response = await fetch("/api/publish", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invio non riuscito. Le bozze sono conservate.");
      setStatus(result.submitted ? "Modifiche inviate. Il sito si aggiornerà tra qualche minuto." : "Nessuna modifica salvata da inviare.");
    } catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Invio non riuscito. Riprova."); }
    finally { operationPending.current = false; setPublishing(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (operationPending.current) { input.value = ""; return; }
    operationPending.current = true;
    setUploading(true); setError(""); setStatus("Caricamento immagine…");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Dimensione massima: 10 MB.");
      const response = await fetch("/api/media", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Caricamento non riuscito.");
      setStatus(`Caricata ${file.name}. Sceglila nel campo Immagine.`);
    } catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Caricamento non riuscito."); }
    finally { operationPending.current = false; setUploading(false); input.value = ""; }
  }
  function changePage(next: DocumentName) {
    if (operationPending.current) return;
    if (latest.current !== baseline.current && !window.confirm("Sono presenti modifiche non salvate. Cambiare pagina e scartarle?")) return;
    history.replaceState(null, "", `/edit?page=${next}`);
    setPage(next);
  }
  if (!loaded || !config || loaded.page !== page) return <div style={{ padding: 24, fontFamily: "system-ui" }}>
    {error ? <><p role="alert">{error}</p><button onClick={() => location.reload()}>Riprova</button></> : "Caricamento contenuti…"}
  </div>;
  return <EditorActionsContext.Provider value={{ page, saving, publishing, uploading, dirty, error, status, changePage, upload, save, publishSaved }}>
    <Puck key={page} config={config as Config} data={loaded.data as Data}
    iframe={{ syncHostStyles: false }}
    headerTitle="Editor" headerPath={pageLabels[page]}
    dictionary={{ "header-publish": "Salva" }}
    onChange={data => { latest.current = snapshot(data); setDirty(latest.current !== baseline.current); }} onPublish={save}
    overrides={{ iframe: frame, headerActions: EditorActions }} />
  </EditorActionsContext.Provider>;
}
