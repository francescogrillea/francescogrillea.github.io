# Portfolio — Next.js e Puck

Il sito e l'editor sono **due servizi separati**, nello stesso progetto. I contenuti sono file JSON nativi Puck nel repository; entrambi usano gli stessi componenti React.

## Avvio locale

Richiede Node.js 22 o successivo. Dopo il clone:

```sh
npm ci
```

Aprire due terminali nella cartella del progetto:

```sh
npm run dev:site
```

Sito: http://127.0.0.1:3000

```sh
npm run dev:editor
```

Editor: http://127.0.0.1:3001/edit

In PowerShell, se l'esecuzione di `npm.ps1` è bloccata, usare `npm.cmd` al posto di `npm`. I servizi ascoltano solo su loopback e hanno directory di compilazione separate (`.next-site` e `.next-editor`).

## Modificare i contenuti

1. Scegliere la pagina nel menu dell'editor. **Header e profilo** modifica i contenuti condivisi da tutte le pagine.
2. Selezionare una sezione nell'anteprima o nell'albero Puck e modificarne i campi. Nei campi elenco usare i controlli Puck per aggiungere, modificare, eliminare, duplicare o riordinare gli elementi. La disposizione delle sezioni è bloccata.
3. Per una nuova immagine, usare **Carica immagine** nell'header. Aprire poi il campo **Immagine** e sceglierla dalla finestra Puck. Le icone esistenti sono disponibili nel menu **Icona**; selezionare **Immagine dalla libreria** per sostituirle con un'immagine.
4. Premere **Salva** e attendere la conferma. Il pulsante salva nel repository locale. Ricaricare il sito sulla porta 3000 per vedere il risultato.

L'anteprima usa il CSS originale dentro l'iframe Puck; i link sono disattivati nell'editor per evitare di uscire dalla pagina. Il sito mantiene la navigazione e il cambio tema originali. I testi sono semplici, senza HTML libero o controlli di layout.

Upload: PNG, JPEG, WebP e GIF, massimo 10 MB. Gli SVG esistenti rimangono selezionabili. Le immagini caricate finiscono in `public/assets/uploads/`; non vengono cancellate automaticamente quando un riferimento viene rimosso.

Le modifiche non salvate rimangono nell'editor. Un cambio pagina richiede conferma prima di scartarle. In caso di errore, il documento precedente è conservato e si può correggere il contenuto e riprovare.

## Build e anteprima statica

```sh
npm run build
```

Genera `out/`, contenente esclusivamente il sito statico. L'editor e le API di scrittura sono esclusi tramite `pageExtensions`, non nascosti con controlli nel browser. La build legge i JSON salvati e non richiede l'editor in esecuzione.

Arrestare il servizio sito se occupa la porta 3000, poi:

```sh
npm run preview
```

Aprire http://127.0.0.1:3000. Questa anteprima funziona anche con l'editor spento. Sono mantenuti `index.html`, `research.html`, `projects.html`, `education.html` e `404.html`.

Nessun comando pubblica online. Font e alcuni loghi restano sulle risorse esterne già usate dal sito: locale non significa offline.

## Dove intervenire

- `content/`: un documento Puck per pagina e `global.json` per header/sidebar. I file e gli upload sono versionabili in Git.
- `src/components.tsx` e `src/puck.config.tsx`: markup React condiviso, campi e rendering Puck; ogni sezione mantiene un tipo e un ID stabile.
- `src/content.ts`: tipi, validazione e struttura fissa delle pagine.
- `public/assets/`: CSS e immagini originali, più gli upload.
- `src/pages/`: pagine pubbliche `*.site.tsx`; editor `*.editor.tsx` e API `*.editor.ts` abilitate solo dal servizio editor.

Per cambiare layout si interviene nei componenti e nel CSS. Per cambiare testi, immagini ed elenchi si usa l'editor. Non ci sono generatori di JSX, copie del markup o database da sincronizzare.

## Verifiche

```sh
npm run typecheck
npm test
npm run build
```

I test verificano il blocco della struttura, le operazioni sugli elenchi annidati, i link consentiti, l'escaping dei testi e le durate delle esperienze. La validazione viene applicata anche alle scritture API, prima della sostituzione del file.

Le API sono intenzionalmente solo locali, senza login: non esporre il servizio editor sulla rete. L'eventuale pubblicazione futura riguarda soltanto `out/`.
