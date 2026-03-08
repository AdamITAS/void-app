const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { getVideos, getVideoById, createVideo, getComments, addComment } = require("../db");
const { generateGhostId } = require("../db/ghost");

// ── UPLOAD CONFIG ──────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const ok = ["video/mp4","video/webm","video/quicktime","video/mov","video/mpeg"];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error("Formato non supportato"));
  },
});

// GET /api/videos
router.get("/", async (req, res) => {
  try {
    const videos = await getVideos();
    res.json({ success: true, videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero dei video" });
  }
});

// GET /api/videos/:id
router.get("/:id", async (req, res) => {
  try {
    const video = await getVideoById(req.params.id);
    if (!video) return res.status(404).json({ error: "Video non trovato" });
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos — publish
router.post("/", upload.single("video"), async (req, res) => {
  try {
    const { description, tags, category } = req.body;
    if (!description?.trim()) return res.status(400).json({ error: "Descrizione obbligatoria" });

    const parsedTags = tags
      ? tags.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 5)
      : [];

    const url = req.file ? `/uploads/${req.file.filename}` : null;
    const ghostId = generateGhostId();

    const video = await createVideo({
      ghostId,
      description: description.trim(),
      tags: parsedTags,
      category: category || "ALTRO",
      url,
      thumbnail: null,
    });

    req.app.get("io").emit("newVideo", video);
    res.json({ success: true, video });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/:id/comments
router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await getComments(req.params.id);
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:id/comments
router.post("/:id/comments", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Testo obbligatorio" });
    if (text.length > 500) return res.status(400).json({ error: "Commento troppo lungo" });

    const ghostId = generateGhostId();
    const comment = await addComment(req.params.id, ghostId, text.trim());

    req.app.get("io").emit("newComment", { videoId: req.params.id, comment });
    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
