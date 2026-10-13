# Zàgara — Chatbot per struttura ricettiva

Assistente virtuale per gli ospiti di una struttura ricettiva (demo: una struttura
sulle pendici dell'Etna, a Catania). Risponde su servizi, orari e cosa vedere in zona
attingendo a documenti markdown caricati dal gestore — una specie di RAG, tutto in memoria.

- **Pagina ospiti** (`/`): info sulla struttura + chat assistente.
- **Area gestore** (`/admin`): configura nome/identità/colori della struttura, gestisci i
  documenti (la "base di conoscenza") da cui la chat attinge e scarica il QR code per le camere.

Nessun database: lo stato vive in RAM ed è salvato su `DATA_DIR/state.json` (default
`./data`) a ogni modifica. All'avvio si ricarica da lì; i documenti di esempio vengono
indicizzati solo se il file non esiste.

## Architettura

- **Frontend**: React + Vite (`src/`).
- **Backend**: Express in-memory (`server/`).
  - `store.js` — stato (config + documenti + chunk con embedding + codice), salvato su file.
  - `rag.js` — chunking, embedding OpenAI e retrieval (con fallback a ricerca per
    parole chiave se manca la API key).
  - `index.js` — API REST.
- **LLM**: OpenAI (`gpt-4o-mini` per la chat, `text-embedding-3-small` per il RAG).

## Avvio

```bash
npm install
cp .env.example .env          # poi inserisci la tua OPENAI_API_KEY
npm run dev                    # avvia frontend (5173) + backend (3001)
```

Apri http://localhost:5173 — l'area gestore è su http://localhost:5173/admin.

> Se la porta 5173 è occupata, Vite ne sceglie un'altra (es. 5174): guarda l'output.

> ⚠️ La key viene letta **solo all'avvio**. Se modifichi `.env`, ferma e riavvia
> `npm run dev` (anche con `--watch`, le modifiche a `.env` non fanno ripartire il
> processo da sole).

### Senza API key

L'app funziona comunque: la chat passa automaticamente a una **ricerca per parole
chiave** sui documenti e mostra i passaggi più rilevanti. Con una key valida ottieni
risposte conversazionali e retrieval semantico (embedding).

## Controllo accessi

- **Area gestore** (`/admin`): protetta da password. Default `reportaid123!`
  (sovrascrivibile con la variabile `ADMIN_PASSWORD`). La password è verificata dal
  server e serve per tutte le scritture (config, documenti, codice).
- **Chat ospiti**: protetta da un **codice di accesso** a 6 caratteri, generato al
  primo avvio e salvato. Il gestore lo vede e lo rigenera dall'area gestore;
  rigenerandolo, il codice precedente smette subito di funzionare. Il link
  `/?code=XXXXXX` (usato dal QR "con codice") sblocca la chat direttamente.

## API

| Metodo | Endpoint           | Descrizione                                  |
| ------ | ------------------ | -------------------------------------------- |
| GET    | `/api/config`      | Configurazione struttura + stato API key     |
| PUT    | `/api/config`      | Aggiorna la configurazione (admin)           |
| GET    | `/api/docs`        | Elenco documenti                             |
| POST   | `/api/docs`        | Aggiunge e indicizza un documento (admin)    |
| DELETE | `/api/docs/:id`    | Elimina un documento (admin)                 |
| POST   | `/api/chat`        | Chat: `{ messages: [...] }` → `{ reply, sources }` |

## Deploy (Render)

In produzione Express serve anche il frontend buildato, quindi è **un solo servizio**.

1. Push del repo su GitHub (già fatto).
2. Su [Render](https://render.com): **New > Blueprint**, seleziona questo repo
   (legge `render.yaml`). In alternativa **New > Web Service** con:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Imposta le variabili d'ambiente (Environment):
   - `OPENAI_API_KEY` — la tua chiave (secret).
   - `ADMIN_PASSWORD` — opzionale, password area gestore.
   - `DATA_DIR=/var/data` — già nel blueprint, punta al disco persistente.
4. Deploy. L'app risponde sull'URL di Render; il codice di accesso ospiti è nei log.

Ogni push su `main` fa partire un nuovo deploy (`autoDeploy: true`).

> **Persistenza**: serve il piano **Starter** + disco persistente (già in `render.yaml`).
> Sul free tier il filesystem è effimero: a ogni sleep/riavvio/deploy le modifiche del
> gestore si perdono. Lo Starter inoltre non va in sleep (niente attesa di ~1 minuto
> alla prima apertura, utile per chi scansiona il QR).

### URL definitivo (QR code)

L'URL `https://<nome-servizio>.onrender.com` resta lo stesso finché il servizio esiste,
quindi il QR scaricato dall'area gestore resta valido tra un deploy e l'altro. Per un
indirizzo "di casa" (es. `assistente.miastruttura.it`): Render → Settings → Custom
Domains, poi un record CNAME dal provider del dominio. Il QR usa l'indirizzo da cui si
apre l'area gestore: generalo dopo aver configurato il dominio definitivo.

Per girare la build di produzione in locale: `npm run build && npm start`.

## Note

- La foto di sfondo (`public/etna.jpg`) è l'Etna su Catania, "Etna Volcano Sicily Italy"
  di gnuckx, Creative Commons (Wikimedia Commons).
