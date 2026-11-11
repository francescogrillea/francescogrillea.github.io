---
name: cloudflare-static-worker
description: Configura o diagnostica la pubblicazione di un export statico su Cloudflare Workers con Wrangler e build da Git. Usala per asset, 404, branch e comandi di build/deploy; non per runtime Next.js, migrazioni a Pages o container editor.
---

# Servire un export statico con Cloudflare Workers

## Risultato e prerequisiti

Un Worker serve soltanto l'export statico, indipendentemente dall'editor. Servono un export riproducibile e l'identificazione di Worker, account e branch destinazione quando si configura un servizio reale. Leggere configurazioni e log disponibili prima di chiedere dati all'utente.

Esempio di invocazione:

> Usa $cloudflare-static-worker per collegare questo export Next.js al Worker già esistente. Prepara configurazione e istruzioni per la build da Git, mantenendo il dominio attuale; non effettuare ancora il deploy.

## Individuare la destinazione

- Leggere manifest, lockfile, configurazioni Wrangler, script di build e eventuali impostazioni CI documentate. Consultare la documentazione ufficiale corrente della versione Wrangler effettiva.
- Verificare il nome esatto del Worker e il branch seguito da Cloudflare. Un Worker di test e quello pubblico sono destinazioni diverse; non assumere che un prefisso di branch nell'URL corrisponda alla configurazione di produzione.
- Preservare il collegamento GitHub, il Worker e il dominio esistenti. Non creare un nuovo Worker per aggirare una configurazione errata, non migrare a Pages e non aggiungere un adapter Next server per un sito già statico.
- Se mancano nome o branch non ricavabili dalla configurazione, chiedere quei valori prima di predisporre un comando capace di pubblicare sulla destinazione sbagliata. Non richiedere token per la sola preparazione locale.

## Build e asset

1. Eseguire il comando di build pubblico del progetto e controllare l'output effettivo. Per Next statico verificare la presenza di `index.html`, pagina 404, altre pagine e asset sotto `out/` o la directory realmente configurata.
2. Configurare `assets.directory` in Wrangler verso quella directory e `assets.not_found_handling: "404-page"` quando esiste una 404 personalizzata. Conservare un'eventuale logica Worker già necessaria; non rimuoverla senza esaminarla. Per un sito di soli asset non introdurre uno script server inutile.
3. Nei Workers Builds collegati a Git configurare separatamente Build (`npm run build` se questo è lo script pubblico) e Deploy (`npx wrangler deploy` o lo script equivalente). La root è la directory che contiene manifest e configurazione, non la cartella generata.
4. Controllare flag del comando Deploy, `--config`, `--env` e override `--assets`: possono indicare un'altra configurazione o sostituire `assets.directory` con `.` o `public`, che non contengono necessariamente l'HTML esportato.
5. La cartella generata può e dovrebbe restare ignorata da Git secondo le convenzioni del progetto: la build remota la ricrea. Non committare `out/` come prima risposta a un errore di build mancante.
6. Non aggiungere GitHub Actions o altri servizi se esiste già l'integrazione Git del Worker. Le credenziali dell'editor per GitHub non sono credenziali Cloudflare e non devono entrare nell'export.

## Verifica locale e diagnosi

- Eseguire build, poi `wrangler deploy --dry-run` con la versione del progetto: è una verifica del bundle, non un deployment riuscito.
- Servire con Wrangler in modalità esplicitamente locale, su loopback e una porta libera. Verificare home, ingressi diretti, URL storici `.html`, asset e un URL inesistente con status 404 e contenuto della pagina personalizzata.
- Verificare che `/edit` e API di scrittura non siano endpoint attivi nel sito pubblico, e che gli asset esportati non contengano segreti. Il sito deve funzionare con editor spento.
- Per `assets.directory does not exist`, leggere il primo errore precedente nel log: verificare che Build sia configurata, eseguita con successo e in modalità pubblica nella root giusta. Confrontare percorso atteso e percorso prodotto.
- Per un 404 pubblico distinguere la pagina del sito dalla risposta generica Cloudflare. Controllare deploy effettivamente attivo, nome del Worker e domini/route prima di attribuirlo ai contenuti. Non promettere una causa precisa senza log o risposte che la supportino.
- Un commit su un branch preview potrebbe non aggiornare la produzione. Distinguere invio a Git, build, pubblicazione di una versione e attivazione sul dominio pubblico.

## Consegna e attivazione

Consegnare configurazione Wrangler, comandi, root/branch attesi e istruzioni per il pannello del Worker. Riportare separatamente verifiche locali e configurazioni remote ancora mancanti.

Un deploy remoto, un push o una modifica a domini/route richiede che quell'azione rientri nella richiesta o nell'autorizzazione esistente; scrivere la configurazione non la autorizza da solo. Non usare token in comandi o URL visibili. Dopo un deploy autorizzato verificare la destinazione esatta e riferire il risultato osservato, senza creare cicli di deploy automatici per tentativi.

Fermare i server locali avviati per la verifica. Non fermare l'editor o altri processi dell'utente per dimostrare l'indipendenza se è possibile usare processi di prova isolati.

Fonti da verificare: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [SSG e 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).
