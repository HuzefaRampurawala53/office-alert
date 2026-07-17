require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./socket/socketHandler");
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Office Alert Backend...");
});

// =====================
// ROUTES
// =====================
const authRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messages");
const roomRoutes = require("./routes/rooms");
const adminRoutes = require("./routes/admin");

app.use("/auth", authRoutes);
app.use("/messages", messageRoutes);
app.use("/rooms", roomRoutes);
app.use("/admin", adminRoutes);

// =====================
// SERVER + SOCKET.IO
// =====================
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow any origin dynamically to support localhost as well as multiple Render deployments
            callback(null, true);
        },
        methods: ["GET", "POST"],
        credentials: true
    },
});

socketHandler(io);

// =====================
// START
// =====================
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

const initDb = require("./config/initDb");

// DB connection check and schema initialization
db.query("SELECT NOW()")
  .then(async (res) => {
    console.log("✅ PostgreSQL Connected:", res.rows[0]);
    await initDb();
  })
  .catch((err) => console.error("❌ PostgreSQL Error:", err));