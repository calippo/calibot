# Agriturismo Zàgara — Chatbot per struttura ricettiva

Assistente virtuale per gli ospiti di una struttura ricettiva (demo: un agriturismo
sulle pendici dell'Etna, a Catania). Risponde su servizi, orari e cosa vedere in zona
attingendo a documenti markdown caricati dal gestore — una specie di RAG, tutto in memoria.

- **Pagina ospiti** (`/`): info sulla struttura + chat assistente.
- **Area gestore** (`/admin`): configura nome/identità della struttura e gestisci i
  documenti (la "base di conoscenza") da cui la chat attinge.

Nessun database: configurazione e documenti vivono in RAM finché il server è acceso.

## Architettura

- **Frontend**: React + Vite (`src/`).
- **Backend**: Express in-memory (`server/`).
  - `store.js` — stato in memoria (config + documenti + chunk).
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
  (sovrascrivibile con la variabile `ADMIN_PASSWORD`).
- **Chat ospiti**: protetta da un **codice di accesso** a 6 caratteri, generato
  all'avvio e stampato nel log del server. Il gestore lo vede e lo rigenera dall'area
  gestore; rigenerandolo, il codice precedente smette subito di funzionare.

## API

| Metodo | Endpoint           | Descrizione                                  |
| ------ | ------------------ | -------------------------------------------- |
| GET    | `/api/config`      | Configurazione struttura + stato API key     |
| PUT    | `/api/config`      | Aggiorna la configurazione                   |
| GET    | `/api/docs`        | Elenco documenti                             |
| POST   | `/api/docs`        | Aggiunge e indicizza un documento markdown   |
| DELETE | `/api/docs/:id`    | Elimina un documento                         |
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
4. Deploy. L'app risponde sull'URL di Render; il codice di accesso ospiti è nei log.

> Il **free tier va in sleep** dopo inattività: al risveglio lo stato in-memory si
> azzera (restano solo i documenti seed). Per dati persistenti serve il piano a pagamento
> + un volume e un piccolo storage su file (facile da aggiungere).

Per girare la build di produzione in locale: `npm run build && npm start`.

## Note

- La foto di sfondo (`public/etna.jpg`) è l'Etna su Catania, "Etna Volcano Sicily Italy"
  di gnuckx, Creative Commons (Wikimedia Commons).
- Per persistere i dati basterebbe sostituire `server/store.js` con un piccolo file JSON
  o un database, senza toccare il resto.
