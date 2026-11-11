---
name: editor-git-publish
description: Collega un editor alla pubblicazione di documenti e immagini tramite commit Git, mantenendo separate bozze salvate e sito pubblicato. Usala per implementare o correggere il flusso Pubblica, senza aggiungere automaticamente hosting o CI.
---

# Pubblicare contenuti salvati tramite Git

## Risultato e prerequisiti

Pubblica deve inviare tutti i contenuti salvati in un commit coerente, preservando codice remoto e bozze locali. Servono reader/validator dei documenti, storage delle immagini, allowlist dei percorsi pubblicabili e repository/branch di destinazione. Riutilizzare il backend editoriale esistente.

Esempio di invocazione:

> Usa $editor-git-publish per aggiungere Pubblica al mio editor. Salva conserva le bozze locali; Pubblica invia tutte le bozze e le immagini referenziate al branch già seguito dal servizio di build.

## Configurazione e contratto

- Verificare il branch effettivamente seguito dalla build del sito: non assumere `main`. Configurare repository e branch soltanto sul server; per GitHub usare `GITHUB_REPOSITORY=owner/repo`, `GITHUB_BRANCH` e `GITHUB_TOKEN`, oppure i nomi equivalenti già presenti.
- Definire esplicitamente autore, email e messaggio del commit con valori concordati o configurabili. Per una nuova integrazione possono essere `PUBLISH_AUTHOR_NAME`, `PUBLISH_AUTHOR_EMAIL`, `PUBLISH_COMMIT_MESSAGE`; non copiare l'identità del sito di riferimento né leggere la configurazione Git personale come default implicito.
- Limitare la credenziale tecnica alla repository e alle scritture necessarie. Non inserirla nel browser, nei documenti JSON, nei file committati o nell'immagine Docker. Non stampare ambienti completi durante la diagnosi.
- Aggiungere una sola operazione `POST /api/publish` o riusare l'equivalente. Un risultato minimo distingue invio riuscito e nessuna differenza, per esempio `{submitted: boolean, commit: string}`. Non aggiungere monitoraggio del provider di build se non richiesto.
- Preservare autenticazione e controllo origine del servizio. Preparare questa integrazione non autorizza push o deployment reali: usarli soltanto se richiesti o già autorizzati nella sessione.

## Flusso server

1. Acquisire il lock condiviso con salvataggi e upload. Rifiutare pubblicazioni simultanee; il controllo deve essere server-side, non soltanto sul pulsante.
2. Leggere e validare tutti i documenti salvati, inclusi quelli condivisi, e raccogliere una copia coerente delle immagini locali referenziate. Includere riferimenti in oggetti ed elenchi annidati. Se un file referenziato manca, segnalare l'errore senza produrre un commit parziale.
3. Creare una directory temporanea posseduta dall'operazione e un checkout isolato dell'ultima versione del branch remoto. Non fare reset, merge o checkout nella copia di lavoro dello sviluppatore.
4. Sovrascrivere soltanto documenti e immagini dello snapshot nei percorsi autorizzati. Controllare la destinazione e rifiutare symlink o percorsi che uscirebbero dal checkout. Non copiare tutta la cartella del progetto e non cancellare upload remoti non referenziati.
5. Eseguire `git add --` con percorsi espliciti. Verificare il diff staged: senza differenze restituire `submitted: false`, senza commit e senza push.
6. Creare un unico commit con l'identità prevista e inviarlo al branch configurato con push normale. Un aggiornamento concorrente del remoto deve produrre un rifiuto, mai un force push.
7. Confermare l'invio solo dopo il successo del push. Rilasciare sempre il lock e ripulire soltanto la directory temporanea verificata; le bozze e gli upload originali rimangono disponibili.

Usare Git standard tramite chiamate a eseguibile con array di argomenti, timeout e prompt interattivi disabilitati. Evitare shell costruite concatenando nomi di file o valori utente. Trasmettere il token tramite un helper `GIT_ASKPASS` eseguito dal server o un meccanismo equivalente che non lo esponga in URL/argv. Se l'helper ha uno shebang, verificarne permessi eseguibili e terminatori LF anche nelle immagini costruite da checkout Windows.

Non ritentare automaticamente push incerti in un ciclo: un errore di rete può avvenire dopo che il remoto ha accettato il commit. Conservare le bozze e consentire un nuovo tentativo esplicito che riparta dal remoto; se i contenuti coincidono risulterà un no-op. Non esporre stderr Git o risposte remote potenzialmente contenenti credenziali.

## Flusso dell'editore

- Salva riguarda la bozza corrente e non modifica Git né avvia build. Pubblica riguarda tutti i documenti salvati, non soltanto quello aperto.
- Disabilitare Pubblica con modifiche correnti non salvate o operazioni in corso. Conservare la possibilità di riprovare dopo un errore.
- Mostrare che l'invio è riuscito e che il sito si aggiornerà dopo la build. Non dichiarare completato il deployment se è stato confermato soltanto il push.
- In caso di build remota fallita, indirizzare ai log del provider; non scartare le bozze né ripristinare automaticamente il branch.

## Verifiche senza GitHub reale

Usare repository bare e checkout temporanei locali, con credenziali fittizie dove serve testare l'helper:

- Tutti i documenti salvati e le immagini referenziate arrivano nello stesso commit; file non referenziati non vengono aggiunti automaticamente.
- Un aggiornamento del codice remoto precedente alla pubblicazione viene conservato; modifiche concorrenti producono un rifiuto senza riscrittura della storia.
- Una seconda pubblicazione identica non crea commit. Un push rifiutato conserva le bozze; rimosso il problema, il retry riesce.
- Richieste duplicate/salvataggi concorrenti rispettano il lock, anche dopo un'eccezione. Errori e log non contengono il token.
- Autore e messaggio del commit sono quelli configurati. Salva non scrive nel remoto.

Consegnare API, configurazione server, allowlist dei percorsi e istruzioni per identificare errori di invio rispetto a errori di build. Non richiedere un servizio backend aggiuntivo quando il framework editor può ospitare l'API.
