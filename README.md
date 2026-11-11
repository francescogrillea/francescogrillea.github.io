# Portfolio — Next.js, Puck, Cloudflare e Docker

Un’unica repository, due deployment indipendenti:

- **Sito pubblico**: Next.js esporta HTML/CSS/JS in `out/`; il Worker Cloudflare esistente serve questi file sul suo dominio.
- **Editor**: Next.js in produzione dentro Docker, sul dominio dell’editor, dietro il proxy HTTPS già disponibile.
- **Bozze**: JSON nativi Puck e upload in un volume persistente, separato dal codice.
- **Pubblicazione**: Git invia i contenuti salvati alla repository; il collegamento GitHub–Cloudflare esistente avvia build e deploy del sito.

Il sito non chiama l’editor: continua a funzionare anche quando la macchina Docker è spenta. Non occorrono database, storage condiviso, GitHub Actions o credenziali Cloudflare nel container dell’editor.

## Salva e Pubblica

1. Scegliere una pagina nell’editor. **Header e profilo** gestisce i contenuti condivisi.
2. Modificare i campi e gli elenchi oppure usare il catalogo Puck per inserire, duplicare, riordinare ed eliminare le sezioni. Gli otto tipi di sezione sono disponibili in tutte le pagine, inclusa la 404. Header e profilo restano la cornice condivisa modificabile tramite i suoi campi.
3. **Salva** conserva la pagina corrente nel volume delle bozze. Non modifica GitHub o il sito pubblico.
4. **Pubblica** invia tutte le pagine salvate e le nuove immagini referenziate in un unico commit. Non salva implicitamente il testo ancora aperto: finché ci sono modifiche non salvate il pulsante è disabilitato.
5. Attendere il messaggio «Modifiche inviate. Il sito si aggiornerà tra qualche minuto».

L’editor conferma l’invio a GitHub; non controlla l’esito della build Cloudflare. In caso di errore conserva le bozze e permette di riprovare. Se non ci sono differenze rispetto al branch remoto non crea un nuovo commit. Un errore di build si gestisce nel pannello Cloudflare, mentre il sito precedente resta quello pubblicato.

Per un’immagine nuova, usare **Carica immagine**, poi sceglierla nel campo **Immagine** della finestra standard Puck. Upload: PNG, JPEG, WebP e GIF, massimo 10 MB. Gli SVG esistenti restano selezionabili. Le immagini già pubblicate non vengono cancellate automaticamente quando un riferimento viene rimosso.

## Sito su Cloudflare

`wrangler.jsonc` conserva il nome del Worker esistente, `francescogrillea`, e serve esclusivamente `out/`, con la pagina 404 personalizzata. Non aggiunge né modifica domini o route del Worker.

Nel Worker già collegato alla repository, impostare:

| Impostazione | Valore |
| --- | --- |
| Branch di produzione | Il branch scelto per le pubblicazioni, per esempio `main` |
| Root directory | Radice della repository |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` oppure `npm run deploy:site` |

Mantenere il dominio pubblico già associato al Worker. La stessa build viene attivata dai commit di codice dello sviluppatore e dai commit di contenuti dell’editor. Pubblicare contenuti non aggiorna né riavvia il container Docker.

Verifica locale del sito:

```sh
npm ci
npm run build
npm run preview
```

L’anteprima statica è su http://127.0.0.1:3000 e funziona con l’editor spento. Sono mantenuti `index.html`, `research.html`, `projects.html`, `education.html` e `404.html`. L’export esclude editor, API di salvataggio, API di pubblicazione e credenziali GitHub.

`npm run deploy:site` esegue un deploy reale su Cloudflare; non è necessario eseguirlo sul server Docker.

## Editor Docker

Sulla macchina che ha già Docker e il proxy HTTPS, aprire il checkout aggiornato del progetto:

```sh
cp .env.editor.example .env.editor
```

Compilare `.env.editor`:

```dotenv
EDITOR_ORIGIN=https://editor.com
GITHUB_REPOSITORY=francescogrillea/francescogrillea.github.io
GITHUB_BRANCH=main
GITHUB_TOKEN=token_da_configurare
```

- `EDITOR_ORIGIN`: origine pubblica esatta dell’editor, con HTTPS e senza slash finale. Il proxy deve conservare l’header **Host** originale.
- `GITHUB_REPOSITORY`: `proprietario/repository`, senza URL.
- `GITHUB_BRANCH`: esattamente il branch seguito dal Worker Cloudflare. Se protetto, deve consentire i commit della credenziale tecnica.
- `GITHUB_TOKEN`: token GitHub fine-grained limitato a questa repository, con **Contents: read/write**. Non occorrono permessi Actions o una credenziale Cloudflare.

Il file `.env.editor` è ignorato da Git e dal contesto Docker. Le credenziali vengono lette soltanto dal server durante l’invio, non inserite nell’immagine, nei dati Puck o negli URL Git. L’autenticazione degli utenti dell’editor resta da implementare separatamente, come concordato.

Avviare:

```sh
docker compose up -d --build
```

Il container usa l’output Next.js `standalone`, Git standard e un utente non root. Compose espone `127.0.0.1:12011`, da collegare al proxy HTTPS esistente. Aprendo la radice del dominio si viene indirizzati a `/edit`.

Se il proxy è un container, collegarlo all’editor attraverso la rete Docker già usata dal proxy e puntarlo a `editor:12011`; la porta di loopback pubblicata serve invece ai proxy eseguiti sul sistema host. Non aggiungere un secondo proxy al progetto.

Per i proxy che richiedono impostazioni esplicite, consentire richieste fino a 12 MB e un timeout di lettura di 180 secondi per l’invio Git. Per esempio, con Nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:12011;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 12m;
    proxy_read_timeout 180s;
}
```

Il browser comunica soltanto con il dominio dell’editor. Non serve aprire CORS tra il sito pubblico e l’editor.

## Aggiornare il codice dell’editor

Sul server:

```sh
git pull
docker compose up -d --build
```

Il volume `editor-data` è inizializzato dal checkout al primo utilizzo. Al riavvio e alla ricreazione del container i file esistenti non vengono sovrascritti dai contenuti dell’immagine, quindi le bozze non pubblicate sono conservate.

Per fermare l’editor:

```sh
docker compose down
```

Non usare `docker compose down -v` per un aggiornamento: `-v` elimina anche il volume delle bozze. Includere il volume nella normale strategia di backup della macchina; GitHub conserva soltanto quanto è già stato pubblicato. La configurazione è pensata per un’unica istanza dell’editor.

## Sviluppo locale

Richiede Node.js 22 o successivo. In due terminali:

```sh
npm run dev:site
```

Sito: http://127.0.0.1:3000

```sh
npm run dev:editor
```

Editor: http://127.0.0.1:12011/edit

In PowerShell con `npm.ps1` bloccato usare `npm.cmd`. In locale le bozze sono in `.editor-data/`, ignorata da Git. Anche in sviluppo Salva non cambia più `content/`: il sito legge la versione pubblicata presente nel checkout. Dopo una pubblicazione remota, `git pull` aggiorna questa versione locale.

`.env.editor` è letto da Docker Compose. Per abilitare Pubblica nel processo di sviluppo, impostare le variabili nel suo ambiente o in `.env.local`; mantenere l’origine locale, per esempio `EDITOR_ORIGIN=http://127.0.0.1:12011`. Senza credenziali si possono comunque modificare e salvare bozze: Pubblica segnala la configurazione mancante.

`EDITOR_DATA_DIR` permette di scegliere un’altra cartella per le bozze; nel container Compose è `/data`. Font e alcuni loghi restano sulle risorse esterne già usate dal sito: hosting locale non significa funzionamento offline.

## Struttura del codice

- `content/`: contenuti pubblicati nel checkout, usati dalla build statica e come dati iniziali di un nuovo volume.
- `public/assets/`: CSS e immagini originali; `uploads/` contiene le immagini già pubblicate.
- `src/components.tsx` e `src/puck.config.tsx`: componenti, campi e rendering condivisi fra sito e anteprima Puck.
- `src/content.ts`: tipi e validazione dei contenuti; le pagine accettano composizioni libere dei componenti registrati, con identificatori univoci.
- `src/server/storage.ts`: inizializzazione e percorsi del volume delle bozze.
- `src/server/publish.ts`: snapshot dei dati salvati e commit Git su un checkout temporaneo dell’ultimo branch remoto. Scrive soltanto i JSON previsti e gli upload referenziati; non usa force push.
- `src/pages/api/`: API disponibili esclusivamente nel servizio editor. La route upload mantiene gli URL `/assets/uploads/...` anche per file aggiunti dopo l’avvio di Next.js.
- `next.config.mjs`: modalità sito/editor, export statico, output standalone e selezione nativa delle route tramite `pageExtensions`.

La pubblicazione non richiede di modificare il codice o sincronizzare due copie dei componenti. Gli aggiornamenti incompatibili allo schema dei contenuti richiederanno una migrazione esplicita delle bozze; non vengono sovrascritte automaticamente.

## Verifiche

```sh
npm run typecheck
npm test
npm run build
docker compose config --quiet
docker build -t portfolio-editor .
```

I test di pubblicazione usano repository Git temporanee locali: nessun push verso GitHub. Verificano persistenza delle bozze, isolamento dal checkout pubblico, immagini referenziate, commit unico, invio senza differenze, rifiuto del push, retry, lock e origine HTTPS configurata.
