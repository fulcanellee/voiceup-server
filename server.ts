import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const PORT = 5000;

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // react default port
  },
});

io.on("connection", (ws) => {
  console.log("User connected");

  ws.on("message", (data) => {
    console.log("Handle user message:", data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Server");
});
