const express = require("express");

const router = express.Router();

router.post("/login", (req, res) => {

    const { username } = req.body;

    console.log(`${username} logged in`);

    res.json({
        success: true,
        username,
    });

});

module.exports = router;