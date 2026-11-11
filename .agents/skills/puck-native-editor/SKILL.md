---
name: puck-native-editor
description: Integra o semplifica Puck in un sito React usando campi, catalogo e controlli nativi, con componenti e JSON condivisi fra editor e sito. Usala per l'integrazione editoriale; non aggiunge da sola storage, pubblicazione Git o deployment.
---

# Integrare Puck attraverso le API pubbliche

## Risultato e prerequisiti

Un editor Puck che modifica i componenti React del progetto e usa la stessa configurazione del renderer pubblico. Servono componenti esistenti o un design definito, un inventario dei documenti e un contratto di caricamento/salvataggio. Individuare gli adapter già disponibili prima di introdurre nuove API.

Esempio di invocazione:

> Usa $puck-native-editor per aggiungere Puck a questo sito React. Voglio tutte le operazioni native sulle sezioni, mantenendo le API di bozze e i comandi Salva/Pubblica già presenti.

## Analisi e configurazione

1. Leggere versione installata, router, configurazioni Puck, componenti, schemi JSON e adapter. Consultare documentazione ufficiale e tipi pubblici della versione effettiva. Non aggiornare Puck a `latest` senza necessità.
2. Identificare documenti pagina e documenti condivisi. Distinguere la cornice `root` dalle sezioni componibili: la root non diventa trascinabile automaticamente. Non trasformare header o sidebar in blocchi senza un requisito esplicito.
3. Collegare gli stessi componenti e la stessa configurazione a `<Puck>` e `<Render>`. Il formato persistito è il JSON nativo `Data`: nessuna traduzione intermedia, HTML generato da modificare o secondo renderer.
4. Per ogni componente dichiarare campi nativi e `defaultProps` completi e validi. Riutilizzare i valori `defaultItemProps` degli elenchi. I componenti basati su elenchi dovrebbero avere un elemento iniziale visibile, salvo diversa convenzione del prodotto.

## Comportamento nativo

- Lasciare disponibili catalogo, inserimento, trascinamento, riordino, duplicazione, eliminazione, undo/redo e viewport predefiniti. Non nascondere pannelli né forzare il pannello iniziale senza richiesta.
- Applicare eventuali restrizioni richieste attraverso `permissions`/configurazione documentata e allineare la validazione server: un'operazione consentita dalla UI deve poter essere salvata.
- Usare `text`, `textarea`, `select`, `object` e `array` per i relativi dati. Non ricostruire form o riordino degli elenchi. Non sostituire campi testuali con rich text se cambierebbe il contratto dei contenuti.
- Usare `external` per collegare una libreria immagini esistente: `fetchList`, `showSearch`, `mapProp`, `mapRow` e riepilogo. Disabilitare la cache quando impedirebbe di vedere nuovi upload. Non costruire un secondo modal di selezione.
- Gli ID dei nuovi blocchi sono generati da Puck. Validare tipi registrati, proprietà e ID non vuoti/univoci; consentire sezioni ripetute, ordine libero e pagina vuota quando le operazioni native sono abilitate.
- Non introdurre contenitori o slot annidati senza componenti che li espongano realmente. Non memorizzare zone che il renderer non utilizza.

## Anteprima e integrazioni applicative

- Usare l'iframe e l'override `iframe` documentati. Isolare gli stili dell'editor con `syncHostStyles: false` quando supportato dalla versione e caricare gli stili del sito nell'anteprima.
- Rendere disponibili CSS e icone per tutte le sezioni inseribili, anche su pagine diverse da quelle originarie. Conservare tema e cornice della pagina.
- Usare classi semantiche per gli adattamenti CSS; evitare dipendenze da ID Puck iniziali. Impedire ID HTML statici duplicati in sezioni ripetibili e controllare gli effetti delle animazioni sui wrapper Puck.
- Preservare gli adapter di caricamento, upload e salvataggio. `onPublish(data)` è una callback applicativa: non implica di per sé Git, deploy o un database.
- Se esistono Salva bozza e Pubblica separati, mantenerli. Per controlli aggiuntivi usare `headerActions`, `Button` e `createUsePuck` pubblici. Definire stabilmente le componenti degli override per non perdere focus o input file durante gli aggiornamenti di stato.
- Lasciare documento e cronologia a Puck. Per le modifiche non salvate confrontare i dati con l'ultimo salvataggio riuscito, non con la posizione undo/redo. Acquisire lo snapshot al momento dell'invio: modifiche successive durante la richiesta devono restare non salvate.
- Bloccare comandi concorrenti dove richiesto, mantenere errori leggibili e non scartare dati dopo errori. Il blocco dei link nell'anteprima deve rispettare il flusso editoriale concordato.

Se manca un backend, concordare o implementare solo l'adapter compreso nella richiesta. Non lasciare un pulsante che dichiara successo senza persistenza reale.

## Accettazione

- Inserire ogni tipo, duplicarlo, spostarlo ed eliminarlo; verificare undo/redo, ID distinti, pagina vuota, salvataggio e ricarica.
- Verificare campi ed elenchi annidati, immagini, cambio documento e contenuti condivisi.
- Provare errori e salvataggi lenti: nessuna perdita di dati e nessun falso stato di salvataggio.
- Confrontare rendering pubblico e anteprima su desktop/mobile nei temi previsti; verificare che l'export pubblico escluda editor e API editoriali quando i servizi sono separati.
- Eseguire typecheck, test pertinenti e build. Consegnare una distinzione chiara fra funzionalità native e adapter del progetto, senza aggiungere librerie UI o sistemi di plugin interni non necessari.

Fonti da consultare: [Getting Started](https://puckeditor.com/docs/getting-started), [headerActions](https://puckeditor.com/docs/api-reference/overrides/header-actions), [iframe](https://puckeditor.com/docs/api-reference/overrides/iframe), [external](https://puckeditor.com/docs/api-reference/fields/external).
