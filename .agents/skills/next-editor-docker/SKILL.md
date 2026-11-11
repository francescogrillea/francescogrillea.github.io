---
name: next-editor-docker
description: Containerizza un editor Next.js con output standalone e volume persistente, separato dal sito pubblico. Usala per Dockerfile, Compose, configurazione runtime e aggiornamenti senza perdita di bozze; non per distribuire automaticamente il sito su Cloudflare.
---

# Eseguire l'editor Next.js in Docker

## Risultato e prerequisiti

Un editor in produzione tramite il server standard Next.js, con dati separati dall'immagine e un aggiornamento manuale ripetibile. Servono progetto Next funzionante, percorsi runtime dello storage e architettura del proxy esistente. Non aggiungere database, registry, CI o un secondo proxy senza requisito.

Esempio di invocazione:

> Usa $next-editor-docker per eseguire l'editor su questa macchina. Il proxy HTTPS esiste già; voglio aggiornare il codice con git pull e docker compose up -d --build mantenendo tutte le bozze.

## Separare sito ed editor

- Leggere router, comandi, output e versione Next. Configurare `output: "standalone"` per l'editor e `output: "export"` per il sito statico se entrambi sono presenti.
- Nei nuovi progetti Pages Router usare `pageExtensions` per escludere dalla build pubblica editor e API. Usare directory di compilazione distinte per i processi; non far scrivere due server nella stessa directory Next.
- Consultare [il modello Pages Router](references/pages-router.md) solo se occorre introdurre questa separazione nello stesso progetto. Per un App Router già funzionante conservare l'architettura compatibile invece di migrare il router automaticamente.
- Verificare l'output reale: la directory dell'export pubblico e la directory delle build interne non sono intercambiabili e il comportamento dipende dalla versione.

## Immagine di produzione

1. Usare una base Node supportata dalle dipendenze effettive e fissare una famiglia/versione coerente fra build e runtime. Conservare il package manager e il lockfile del progetto.
2. Nel primo stage installare le dipendenze dal lockfile, copiare i sorgenti e lanciare soltanto la build editor. Non fornire token Git o altre credenziali durante la build.
3. Nel runtime copiare l'output standalone, gli asset della build nella directory statica attesa, `public` e i documenti iniziali usati per inizializzare il volume. Nei monorepo controllare il percorso effettivo di `server.js` e dell'output tracing.
4. Installare Git e certificati soltanto se il publisher lo richiede. Copiare un eventuale helper Git e renderlo eseguibile con LF: un file CRLF può fallire in Linux con `node\r` nello shebang.
5. Creare directory dati/cache scrivibili dall'utente applicativo. Eseguire come utente non root e avviare `node server.js`, adattando il percorso verificato. Non introdurre un server Express o un launcher custom.
6. Escludere dal contesto almeno segreti `.env*`, `.git`, dipendenze locali, build, export, bozze, cache e artefatti di verifica/provider. I file di esempio possono rimanere nella repository, ma non contengono segreti.

Le variabili che cambiano fra installazioni devono essere lette dal server a runtime. Non usare prefissi `NEXT_PUBLIC_` per token e configurazione privata e non inserire segreti in `next.config` tramite opzioni che li incorporano nel bundle.

## Compose, rete e configurazione

- Una sola istanza editor come default, con restart policy, volume nominato per lo storage e file runtime ignorato da Git, per esempio `.env.editor` letto da Compose. Non montare il checkout al posto dell'applicazione di produzione.
- Esporre il server su `0.0.0.0` dentro il container e, quando il proxy gira sull'host, pubblicare soltanto `127.0.0.1:3001:3001`. `EXPOSE` da solo non pubblica una porta.
- Se il proxy è containerizzato, collegare l'editor alla rete Docker del proxy e usare il nome del servizio come destinazione. `127.0.0.1` dentro il proxy indicherebbe il proxy stesso.
- Configurare l'origine pubblica esatta in `EDITOR_ORIGIN`; il proxy deve preservare Host e fornire HTTPS. Configurare limiti body e timeout coerenti con upload e operazioni Git. Non esporre la porta su tutte le interfacce soltanto per aggirare un problema di proxy.
- Distinguere `.env.editor` passato da Compose dai file caricati automaticamente da Next in sviluppo. Dopo modifiche alle variabili runtime ricreare il container; una modifica al solo ambiente non richiede una nuova build dell'immagine.
- Un healthcheck HTML dimostra soltanto che il processo risponde. Verificare separatamente le API con Host/Origin corrispondenti alla configurazione: una pagina `/edit` 200 può accompagnarsi a API 404 per un'origine errata.

## Verifica e operazioni

Verificare con un volume di prova distinto dalle bozze reali:

- Build dell'immagine e avvio senza mount del codice sorgente; caricamento di pagine, API e asset.
- Salvataggio e upload, lettura immediata dei nuovi file, restart e ricreazione del container con lo stesso volume.
- Aggiornamento dell'immagine con dati iniziali cambiati: i dati già nel volume non devono essere sovrascritti.
- Se presente, funzionamento dell'helper Git nel runtime Linux con credenziale fittizia e senza pubblicazioni reali.
- `docker compose config --quiet` senza stampare la configurazione risolta che potrebbe contenere token.

Documentare nel progetto avvio e aggiornamento manuale:

```sh
git pull
docker compose up -d --build
```

Per applicare solo cambiamenti runtime usare `docker compose up -d --force-recreate` sul servizio interessato. Per fermare usare `docker compose down` senza `-v`: eliminare il volume non è un aggiornamento. Documentare backup e ripristino dei dati, indicando di fermare le scritture per ottenere una copia coerente. Non eliminare volumi reali durante i test.

Preparare Dockerfile/Compose non autorizza distribuzioni su macchine remote. Fermare e rimuovere soltanto le risorse temporanee create per la verifica.

Riferimento da verificare: [Next.js standalone](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output).
