const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ── SCHEMA ─────────────────────────────────────────────────────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS videos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ghost_id    TEXT NOT NULL,
    description TEXT NOT NULL,
    tags        TEXT[] DEFAULT '{}',
    category    TEXT NOT NULL DEFAULT 'ALTRO',
    url         TEXT,
    thumbnail   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS votes (
    id          SERIAL PRIMARY KEY,
    video_id    UUID REFERENCES videos(id) ON DELETE CASCADE,
    session_id  TEXT NOT NULL,
    direction   TEXT NOT NULL CHECK (direction IN ('up','down')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(video_id, session_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id    UUID REFERENCES videos(id) ON DELETE CASCADE,
    ghost_id    TEXT NOT NULL,
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
`;

async function initDB() {
  try {
    await pool.query(SCHEMA);
    console.log("✓ Database pronto");
  } catch (err) {
    console.error("✗ Errore DB:", err.message);
    process.exit(1);
  }
}

// ── VIDEOS ─────────────────────────────────────────────────────────────────

async function getVideos() {
  const { rows } = await pool.query(`
    SELECT
      v.*,
      COUNT(CASE WHEN vt.direction='up'   THEN 1 END)::int AS upvotes,
      COUNT(CASE WHEN vt.direction='down' THEN 1 END)::int AS downvotes,
      COUNT(DISTINCT c.id)::int                             AS comment_count
    FROM videos v
    LEFT JOIN votes    vt ON vt.video_id = v.id
    LEFT JOIN comments c  ON c.video_id  = v.id
    GROUP BY v.id
    ORDER BY (COUNT(CASE WHEN vt.direction='up' THEN 1 END) - COUNT(CASE WHEN vt.direction='down' THEN 1 END)) DESC,
             v.created_at DESC
  `);
  return rows;
}

async function getVideoById(id) {
  const { rows } = await pool.query(`
    SELECT
      v.*,
      COUNT(CASE WHEN vt.direction='up'   THEN 1 END)::int AS upvotes,
      COUNT(CASE WHEN vt.direction='down' THEN 1 END)::int AS downvotes
    FROM videos v
    LEFT JOIN votes vt ON vt.video_id = v.id
    WHERE v.id = $1
    GROUP BY v.id
  `, [id]);
  return rows[0] || null;
}

async function createVideo({ ghostId, description, tags, category, url, thumbnail }) {
  const { rows } = await pool.query(`
    INSERT INTO videos (ghost_id, description, tags, category, url, thumbnail)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [ghostId, description, tags, category, url, thumbnail]);
  return { ...rows[0], upvotes: 0, downvotes: 0, comment_count: 0 };
}

// ── VOTES ──────────────────────────────────────────────────────────────────

async function getVotesToday(sessionId) {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::int AS count FROM votes
    WHERE session_id = $1
      AND created_at >= NOW() - INTERVAL '24 hours'
  `, [sessionId]);
  return rows[0].count;
}

async function hasVoted(videoId, sessionId) {
  const { rows } = await pool.query(`
    SELECT direction FROM votes WHERE video_id=$1 AND session_id=$2
  `, [videoId, sessionId]);
  return rows[0]?.direction || null;
}

async function castVote(videoId, sessionId, direction) {
  // Check daily limit
  const todayCount = await getVotesToday(sessionId);
  if (todayCount >= 10) return { error: "Hai esaurito i 10 voti di oggi" };

  // Check already voted
  const existing = await hasVoted(videoId, sessionId);
  if (existing) return { error: "Hai già votato questo video" };

  await pool.query(`
    INSERT INTO votes (video_id, session_id, direction)
    VALUES ($1, $2, $3)
  `, [videoId, sessionId, direction]);

  const video = await getVideoById(videoId);
  const votesLeft = 10 - (todayCount + 1);
  return { success: true, video, votesLeft };
}

// ── COMMENTS ───────────────────────────────────────────────────────────────

async function getComments(videoId) {
  const { rows } = await pool.query(`
    SELECT * FROM comments WHERE video_id=$1 ORDER BY created_at ASC
  `, [videoId]);
  return rows;
}

async function addComment(videoId, ghostId, text) {
  const { rows } = await pool.query(`
    INSERT INTO comments (video_id, ghost_id, text)
    VALUES ($1, $2, $3) RETURNING *
  `, [videoId, ghostId, text]);
  return rows[0];
}

module.exports = { pool, initDB, getVideos, getVideoById, createVideo, getVotesToday, hasVoted, castVote, getComments, addComment };
