const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/:user1/:user2", async (req, res) => {
  const user1 = req.params.user1.trim().toLowerCase();
  const user2 = req.params.user2.trim().toLowerCase();

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