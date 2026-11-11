---
name: html-to-next-static
description: Migra siti HTML, CSS e JavaScript a React e Next.js con export statico, conservando design, interazioni e URL esistenti. Usala per una conversione fedele, senza introdurre automaticamente editor o hosting.
---

# Migrare HTML a Next.js statico

## Risultato e prerequisiti

Produrre un sito React realmente statico, modificabile nel sorgente, con lo stesso aspetto e comportamento del sito di partenza. Servono i sorgenti o un riferimento accessibile e gli asset necessari. Non partire da un nuovo design.

Esempio di invocazione:

> Usa $html-to-next-static per migrare questo sito HTML a Next.js. Mantieni gli URL `.html`, i due temi e il comportamento mobile; non aggiungere un CMS.

## Analisi prima della conversione

1. Leggere manifest, configurazioni e struttura della repository. Se esiste già Next.js, conservare router e convenzioni compatibili; per un nuovo progetto usare TypeScript e Pages Router. Consultare la documentazione ufficiale della versione scelta, senza aggiornare dipendenze non pertinenti.
2. Inventariare pagine, URL di ingresso, link interni, ancore, query string, 404, metadati, immagini, font locali/remoti e licenze disponibili. Individuare header, navigazione e altre parti condivise.
3. Leggere i CSS prima di cambiare il DOM: annotare selettori basati su figli diretti, ID, ordine degli elementi e classi del body. Inventariare script, eventi, animazioni, tema persistito e comportamenti allo scroll.
4. Acquisire schermate iniziali a larghezze riproducibili, per esempio 1440 e 390 px, nei temi disponibili. Usare dati e stato del tema identici nel confronto; attendere font e animazioni. Conservare il riferimento in una directory di verifica, senza sovrascrivere il sito originale.

Se mancano sorgenti o risorse che impediscono la fedeltà, esplicitare il limite e chiedere solo le informazioni indispensabili. Non inventare testi o immagini sostitutive senza indicarlo.

## Conversione

- Configurare `output: "export"` e verificare la directory realmente generata dalla versione di Next.js in uso. Non aggiungere SSR, API o un server custom al sito pubblico.
- Conservare markup, ordine dei nodi, CSS e asset. Convertire gli attributi HTML in JSX e rendere esplicite le chiavi degli elenchi; evitare wrapper che cambiano i selettori CSS o il layout.
- Estrarre componenti React soltanto per parti condivise o sezioni con una responsabilità chiara. Non creare una traduzione HTML→React eseguita a runtime, né due versioni del rendering.
- Sostituire script che caricano frammenti HTML con composizione React. Per eventi, observer, timer e animazioni usare effetti con cleanup. Quando il componente può vivere in un iframe, ricavare documento e finestra da un ref (`ownerDocument` e `defaultView`).
- Inizializzare il tema abbastanza presto da evitare un cambio visibile al caricamento, preservando la preferenza esistente. Non rimuovere accessibilità o supporto alla tastiera durante la conversione.
- Preservare i percorsi delle immagini e i font; non introdurre ottimizzazioni immagini che richiedono un server in un export statico. Riutilizzare la strategia immagini compatibile già presente.
- Mantenere titoli, descrizioni, canonical, lingua e destinazioni dei link. Assicurarsi che i vecchi URL `.html` siano raggiungibili nell'export/hosting previsto, non soltanto nel dev server. Una rewrite di sviluppo non dimostra la compatibilità dell'export.
- Se l'originale usa ID o selettori JS per istanza, evitare duplicazioni quando la stessa sezione diventa un componente ripetibile.

## Verifica e consegna

- Eseguire typecheck e build appropriati al progetto; servire l'export con un pacchetto esistente, senza dipendere dal dev server.
- Verificare ingresso diretto su ogni URL storico, refresh, link, ancore, navigazione, immagini, font e risposta 404. Non usare un fallback SPA che nasconde URL errati dietro HTTP 200.
- Confrontare schermate desktop/mobile e temi; controllare spaziatura, tipografia, wrapping, sidebar, animazioni e stato allo scroll. Documentare differenze e risorse esterne residue.
- Il sito deve funzionare anche senza processi di sviluppo o editor in esecuzione. Fermare i processi temporanei avviati per la verifica.
- Consegnare codice, comandi locali e limitazioni effettive. Non dichiarare fedeltà visiva se sono stati eseguiti soltanto test di build.

Questa skill termina con la migrazione statica. Aggiungere editor, storage o deployment soltanto se inclusi nella richiesta; non richiedere altre skill per completare la conversione.

Riferimento da verificare per la versione del progetto: [Next.js static exports](https://nextjs.org/docs/pages/guides/static-exports).
