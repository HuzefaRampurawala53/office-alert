const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/auth");

// Protected: requires valid JWT
router.get("/:user1/:user2", authMiddleware, async (req, res) => {
  const user1 = req.params.user1.trim().toUpperCase();
  const user2 = req.params.user2.trim().toUpperCase();

  try {
    const result = await db.query(
      `
      SELECT *
      FROM messages
      WHERE
        (sender = $1 AND receiver = $2)
        OR
        (sender = $2 AND receiver = $1)
      ORDER BY created_at ASC
      `,
      [user1, user2]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database Error" });
  }
});

module.exports = router;