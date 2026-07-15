const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const socketHandler = require("./socket/socketHandler");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Office Alert Backend...");
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

socketHandler(io);

const PORT = 4000;

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});
const db = require("./config/db");

db.query("SELECT NOW()")
  .then((res) => console.log("✅ PostgreSQL Connected:", res.rows[0]))
  .catch((err) => console.error(err));

  const messageRoutes = require("./routes/messages");

app.use("/messages", messageRoutes);