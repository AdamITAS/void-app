require("dotenv").config();
const express  = require("express");
const http     = require("http");
const { Server } = require("socket.io");
const cors     = require("cors");
const path     = require("path");
const { v4: uuidv4 } = require("uuid");
const { initDB } = require("./db");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session via header (client generates UUID and stores in localStorage)
app.use((req, res, next) => {
  req.sessionId = req.headers["x-session-id"] || uuidv4();
  next();
});

// ── ROUTES ─────────────────────────────────────────────────────────────────
app.use("/api/videos", require("./routes/videos"));
app.use("/api/votes",  require("./routes/votes"));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ── SOCKET ─────────────────────────────────────────────────────────────────
io.on("connection", socket => {
  console.log(`+ ${socket.id}`);
  socket.on("disconnect", () => console.log(`- ${socket.id}`));
});

// ── BOOT ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB().then(() => {
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`\n🔲  VOID online → http://localhost:${PORT}\n`)
  );
});
