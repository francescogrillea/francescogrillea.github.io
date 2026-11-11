---
name: editor-local-drafts
description: Implementa bozze JSON e immagini persistenti su filesystem per un editor locale o Docker, separate dai contenuti pubblicati. Usala per persistenza, API documenti e upload; non per pubblicare su Git o configurare hosting.
---

# Bozze e immagini persistenti

## Risultato e prerequisiti

Salvare modifiche editoriali senza cambiare il checkout pubblicato. Servono formato dei documenti, schemi di validazione, elenco dei documenti ammessi e origine dell'editor. Riutilizzare API e convenzioni esistenti.

Esempio di invocazione:

> Usa $editor-local-drafts per conservare bozze e upload su disco. Salva non deve cambiare il sito pubblico e i file devono sopravvivere alla ricreazione del container.

## Storage e inizializzazione

- Separare i percorsi pubblicati dallo storage runtime. Come convenzione nuova usare `EDITOR_DATA_DIR`, con una directory locale ignorata da Git e `/data` nel container; preservare nomi esistenti equivalenti.
- Tenere documenti e upload in sottodirectory distinte dello storage. La build statica deve leggere esclusivamente il checkout pubblicato, non questa directory.
- Al primo utilizzo creare lo storage copiando i documenti iniziali e gli upload già pubblicati. Usare creazione esclusiva/copia senza sovrascrittura, una promessa di inizializzazione condivisa e un marker finale; un avvio interrotto deve poter riprendere senza distruggere file completati.
- Quando il marker esiste non ricopiare i contenuti dell'immagine o del checkout. Un aggiornamento dello schema richiede una migrazione esplicita delle bozze, non un reset automatico.
- Validare prima della scrittura; scrivere su un file temporaneo univoco nella stessa directory e sostituire atomicamente il documento. In caso di errore conservare la versione precedente e rimuovere soltanto il temporaneo posseduto dall'operazione.
- Coordinare scritture, upload e un'eventuale pubblicazione con lo stesso lock per una singola istanza. Se il progetto prevede più processi scriventi, un lock in memoria non basta: chiarire il requisito prima di promettere coerenza multiistanza.

## Contratto API di riferimento

Usare API standard del framework. Adattare i nomi se il progetto ha già un contratto; non creare endpoint equivalenti duplicati.

| Operazione | Contratto suggerito | Effetto |
| --- | --- | --- |
| Leggi documento | `GET /api/content?document=slug` | Restituisce il documento JSON della bozza |
| Salva documento | `PUT /api/content?document=slug` | Valida e salva atomicamente il JSON ricevuto |
| Cerca immagini | `GET /api/media?query=testo` | Restituisce elementi `{src, name}` per il selettore |
| Carica immagine | `POST /api/media` | Riceve il file binario e restituisce `{src, name}` con HTTP 201 |
| Leggi upload | `GET/HEAD /assets/uploads/nome` | Serve il file runtime attraverso una route editor |

- Derivare `slug` da un allowlist del progetto, mai da un percorso arbitrario. Conservare il JSON nativo dell'editor, inclusi gli ID dei componenti.
- Per nuovi contratti limitare il body JSON, per esempio a 2 MB. Come default immagini usare PNG/JPEG/WebP/GIF, massimo 10 MB, con verifica della firma binaria e limite applicato durante la lettura del body.
- Normalizzare il nome originale e aggiungere un identificatore univoco generato dal server. Non accettare percorsi dal client, traversal o symlink come file da servire. Gli SVG esistenti possono restare leggibili; non abilitarne automaticamente l'upload.
- Servire i nuovi upload con una route runtime: i file aggiunti dopo l'avvio potrebbero non comparire nell'indice iniziale di `public` di Next.js. Mantenere URL compatibili con la successiva copia nell'export statico.
- Distinguere errori di validazione (400), file assenti (404), limite upload (413), operazione concorrente (409) ed errori server, senza restituire stack o percorsi interni. Preservare gli errori applicativi già definiti.
- Non eliminare automaticamente immagini quando viene rimosso un riferimento: potrebbero essere usate altrove o ancora pubblicate.

## Origine e isolamento

- Le API di scrittura appartengono al servizio editor e devono essere escluse dalla build pubblica. Impostare `Cache-Control: no-store` per dati editoriali.
- Usare `EDITOR_ORIGIN` come origine esatta (`schema://host[:porta]`, senza path o slash finale); validare Host, Origin quando presente e richieste cross-site. Il proxy deve preservare l'Host pubblico configurato.
- Per il test locale scegliere esplicitamente `http://localhost:3001` oppure `http://127.0.0.1:3001` e usare lo stesso valore nel browser. Non confondere `localhost` con `localhost.com`.
- `EDITOR_ORIGIN` non configura DNS, certificati o HTTPS. Il controllo di origine non è autenticazione: preservare quella esistente e dichiarare se rimane fuori dal lavoro richiesto.

## Accettazione e consegna

- Salvare una bozza e dimostrare che i file pubblicati non cambiano. Riavviare il processo e verificare contenuti e upload.
- Provare una ricreazione con dati iniziali diversi: lo storage esistente deve restare invariato.
- Verificare salvataggio non valido, percorso non ammesso, upload troppo grande/non supportato e richieste concorrenti: nessuna perdita della bozza precedente.
- Un upload deve essere immediatamente leggibile e selezionabile senza riavviare il servizio.
- Consegnare il contratto API, configurazione dei percorsi, istruzioni di backup e limiti di concorrenza. Usare storage isolato per le prove, senza pulire bozze reali.
