# Due processi Pages Router nello stesso progetto

Questo modello serve soltanto quando la richiesta prevede sito statico ed editor server separati nella stessa base di codice. Prima di adattarlo verificare versione Next, estensioni esistenti e cartella di export effettiva.

## Convenzioni

- Nuova variabile di esempio `APP_MODE=site|editor`; mantenere il nome equivalente già usato dal progetto.
- Pagine condivise: `index.site.tsx`, `404.site.tsx`, `_app.site.tsx`, `_document.site.tsx` e altre pagine pubbliche.
- Editor: `edit.editor.tsx`; API: `pages/api/content.editor.ts` e altre route editoriali.
- Componenti e contenuti importati dalle route vivono fuori da `pages`, senza duplicazione fra i processi.

Esempio di `next.config.mjs` da adattare, non da sovrascrivere su una configurazione esistente:

```js
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function config(phase) {
  const editor = process.env.APP_MODE === "editor";
  const development = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    pageExtensions: editor ? ["site.tsx", "editor.tsx", "editor.ts"] : ["site.tsx"],
    ...(editor ? { distDir: ".next-editor" } : development ? { distDir: ".next-site" } : {}),
    ...(!development ? { output: editor ? "standalone" : "export" } : {}),
  };
}
```

I comandi devono impostare la modalità esplicitamente, anche quando viene eseguito il processo in Docker. Usare il meccanismo portabile già presente nel progetto o `cross-env` se serve supportare shell diverse. Sito e editor possono usare rispettivamente le porte locali 3000 e 3001.

Per il server standalone con `distDir: ".next-editor"`, controllare la presenza di:

```text
.next-editor/standalone/server.js
.next-editor/static/
public/
content/                 # solo se questo è il percorso dei documenti iniziali
```

Nel runtime collocare il contenuto di `standalone` nella directory dell'applicazione, gli statici sotto `.next-editor/static` e i dati iniziali nel percorso realmente letto dal server. Non presumere che il tracing includa letture filesystem dinamiche.

## Upload e URL storici

Se gli upload runtime mantengono URL `/assets/uploads/...`, aggiungere soltanto nell'editor la rewrite verso la route che legge lo storage. Nel sito statico quel percorso deve corrispondere a file realmente esportati.

Se il dev server necessita di alias per vecchi URL `.html`, limitarli allo sviluppo. La compatibilità in produzione va verificata sull'export e sull'hosting reale; non introdurre rewrites server in un export statico.

## Verifiche discriminanti

1. Avviare i due processi contemporaneamente: ciascuno usa la propria directory di compilazione.
2. Generare il sito: l'export contiene pagine e asset, non `/edit` o API editoriali.
3. Generare l'editor: il server standalone contiene le route editoriali e riesce a leggere dati iniziali e volume runtime.
4. Fermare l'editor: l'export del sito rimane navigabile.
