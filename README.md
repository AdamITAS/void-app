# 🔲 VOID v2

Feed video anonimo. Nessun profilo. Vince solo il contenuto.

---

## Deploy su Railway (passo per passo)

### 1. Crea il repository GitHub

```bash
git init
git add .
git commit -m "void v2"
# crea repo su github.com, poi:
git remote add origin https://github.com/TUO-USERNAME/void-app.git
git push -u origin main
```

### 2. Aggiungi PostgreSQL su Railway

1. Vai su [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub Repo** → seleziona il tuo repo
3. Clicca **+ New** → **Database** → **PostgreSQL**
4. Railway genera `DATABASE_URL` automaticamente

### 3. Collega il DB all'app

1. Clicca sul servizio Node.js
2. Tab **Variables** → **+ Add Variable Reference**
3. Seleziona `DATABASE_URL` dal servizio PostgreSQL
4. Aggiungi anche: `NODE_ENV = production`

### 4. Deploy

Railway fa il deploy automatico a ogni push su `main`.

---

## Sviluppo locale

```bash
# 1. Copia il file env
cp .env.example .env
# Riempilo con la tua DATABASE_URL (da Railway o locale)

# 2. Installa
npm install

# 3. Avvia
npm run dev
# → http://localhost:3000
```

### PostgreSQL locale (opzionale)

```bash
# macOS
brew install postgresql && brew services start postgresql
createdb void_local

# .env
DATABASE_URL=postgresql://localhost:5432/void_local
```

---

## Struttura

```
void-v2/
├── server.js           ← Express + Socket.io
├── package.json
├── .env.example
├── db/
│   ├── index.js        ← Schema PostgreSQL + query
│   └── ghost.js        ← Generatore Ghost ID
├── routes/
│   ├── videos.js       ← CRUD video + commenti
│   └── votes.js        ← Sistema voti
└── public/
    ├── index.html      ← Tutta la UI
    └── uploads/        ← Video caricati
```

---

## API

| Metodo | Endpoint | Body |
|--------|----------|------|
| GET | `/api/videos` | — |
| POST | `/api/videos` | `multipart: video, description, tags, category` |
| POST | `/api/votes/:id` | `{ direction: "up" \| "down" }` |
| GET | `/api/votes/status` | — |
| GET | `/api/videos/:id/comments` | — |
| POST | `/api/videos/:id/comments` | `{ text }` |

**Header:** `x-session-id: <uuid>` (generato automaticamente dal frontend)

---

## Note produzione

- **Video storage**: su Railway i file in `public/uploads/` sono persistenti se usi un **Volume**. Per produzione seria considera Cloudflare R2 o AWS S3.
- **DB backup**: Railway fa backup automatici del PostgreSQL.
- **Dominio**: Railway assegna un dominio gratuito `.up.railway.app`. Puoi collegare un dominio custom dalle impostazioni.
