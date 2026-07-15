const db = require("../config/db"); 
const onlineUsers = {}; // username -> array of socket ids

function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("Client Connected");
    console.log("Socket ID:", socket.id);
    // =======================
    // Typing
    // =======================
    socket.on("typing", ({ to, from }) => {
      io.to(to).emit("user_typing", { from });
    });

    // =======================
    // Stop Typing
    // =======================
    socket.on("stop_typing", ({ to, from }) => {
      io.to(to).emit("user_stop_typing", { from });
    });
    // ==========================
    // USER JOIN
    // =============================
    socket.on("user_join", (username) => {
      const normalizedUsername = username.trim().toLowerCase();
      socket.username = normalizedUsername;

      socket.join(normalizedUsername);

      if (!onlineUsers[normalizedUsername]) {
        onlineUsers[normalizedUsername] = [];
      }

      if (!onlineUsers[normalizedUsername].includes(socket.id)) {
        onlineUsers[normalizedUsername].push(socket.id);
      }

      io.emit("online_users", Object.keys(onlineUsers));

      console.log("Online Users:", onlineUsers);
    });

    // ==========================
    // RING USER
    // ==========================
    socket.on("ring_user", (targetUser) => {
      io.to(targetUser).emit("bell_ring", {
        from: socket.username,
      });
    });

    // ==========================
    // SEND MESSAGE
    // ==========================
    socket.on("send_message", async (data) => {
    try {

        console.log("📨 Incoming Message:", data);

        const result = await db.query(
            `
            INSERT INTO messages
            (sender, receiver, message)
            VALUES ($1, $2, $3)
            RETURNING *;
            `,
            [
                data.from.trim().toLowerCase(),
                data.to.trim().toLowerCase(),
                data.message.trim()
            ]
        );

        const savedMessage = result.rows[0];
        console.log("✅ Saved:", savedMessage);

        const messageData = {
            id: savedMessage.id,
            from: savedMessage.sender,
            to: savedMessage.receiver,
            message: savedMessage.message,
            delivered: savedMessage.delivered,
            seen: savedMessage.seen,
            time: new Date(savedMessage.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };

        io.to(data.to.trim().toLowerCase()).emit("receive_message", messageData);
        io.to(data.from.trim().toLowerCase()).emit("receive_message", messageData);

    } catch (err) {
        console.error("❌ Database Error:", err);
    }
    });

    // ==========================
    // MESSAGE DELIVERED
    // ==========================
    socket.on("message_delivered", async ({ id }) => {
      await db.query(
        `UPDATE messages SET delivered = true WHERE id = $1`,
        [id]
      );
      socket.broadcast.emit("message_delivered_update", { id });
    });

    // ==========================
    // MESSAGE SEEN
    // ==========================
    socket.on("message_seen", async ({ id }) => {
      await db.query(
        `UPDATE messages SET seen = true WHERE id = $1`,
        [id]
      );
      socket.broadcast.emit("message_seen_update", { id });
    });


    // ==========================
    // DISCONNECT
    // ==========================
    socket.on("disconnect", () => {
      const username = socket.username;

      console.log(`${socket.id} (${username}) disconnected`);

      if (username && onlineUsers[username]) {
        onlineUsers[username] =
          onlineUsers[username].filter((id) => id !== socket.id);

        if (onlineUsers[username].length === 0) {
          delete onlineUsers[username];
        }
      }

      io.emit("online_users", Object.keys(onlineUsers));

      console.log("Online Users:", onlineUsers);
    });
  });
}

module.exports = socketHandler;