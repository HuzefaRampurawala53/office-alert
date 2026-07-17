const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

// Fetch private messages between two users (isolated by organization_id)
router.get("/:user1/:user2", authMiddleware, async (req, res) => {
  const { organization_id } = req.user;
  const user1 = req.params.user1.trim().toUpperCase();
  const user2 = req.params.user2.trim().toUpperCase();

  try {
    const result = await db.query(
      `
      SELECT *
      FROM messages
      WHERE
        organization_id = $1
        AND room_id IS NULL
        AND (
          (sender = $2 AND receiver = $3)
          OR
          (sender = $3 AND receiver = $2)
        )
      ORDER BY created_at ASC
      `,
      [organization_id, user1, user2]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch private messages error:", err);
    res.status(500).json({ error: "Database Error fetching messages." });
  }
});

// Fetch messages for a specific room (isolated by organization_id)
router.get("/room/:roomId", authMiddleware, async (req, res) => {
  const { organization_id } = req.user;
  const roomId = req.params.roomId;

  try {
    // Verify room belongs to the user's organization first
    const roomCheck = await db.query(
      "SELECT id FROM rooms WHERE id = $1 AND organization_id = $2",
      [roomId, organization_id]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(403).json({ error: "Forbidden. You cannot access messages from this room." });
    }

    const result = await db.query(
      `
      SELECT *
      FROM messages
      WHERE
        organization_id = $1
        AND room_id = $2
      ORDER BY created_at ASC
      `,
      [organization_id, roomId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch room messages error:", err);
    res.status(500).json({ error: "Database Error fetching room messages." });
  }
});

module.exports = router;