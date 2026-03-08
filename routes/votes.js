const express = require("express");
const router  = express.Router();
const { castVote, getVotesToday, hasVoted } = require("../db");

// POST /api/votes/:videoId
router.post("/:videoId", async (req, res) => {
  try {
    const { direction } = req.body;
    if (!["up","down"].includes(direction))
      return res.status(400).json({ error: "direction deve essere 'up' o 'down'" });

    const result = await castVote(req.params.videoId, req.sessionId, direction);
    if (result.error) return res.status(400).json({ error: result.error });

    // Real-time broadcast
    req.app.get("io").emit("voteUpdate", {
      videoId:  req.params.videoId,
      upvotes:  result.video.upvotes,
      downvotes: result.video.downvotes,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/votes/status
router.get("/status", async (req, res) => {
  try {
    const used = await getVotesToday(req.sessionId);
    res.json({ success: true, votesLeft: Math.max(0, 10 - used) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
