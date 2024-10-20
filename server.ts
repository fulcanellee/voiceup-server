import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { EVENTS } from "./events";
import { version, validate } from "uuid";

const app = express();
const server = createServer(app);
const PORT = 5000;

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // react default port
  },
});

const getRooms = () => {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys()).filter(
    (id) => validate(id) && version(id) === 4
  );
};

const updateRoomsData = () => {
  io.emit(EVENTS.EMIT_ROOMS, {
    rooms: getRooms(),
  });
};

io.on("connection", (socket) => {
  updateRoomsData();

  socket.on("message", (data) => {
    console.log("Handle user message:", data);
  });

  socket.on(EVENTS.JOIN, (config) => {
    const { room: roomID } = config;
    const { rooms: joinedRooms } = socket;

    if (Array.from(joinedRooms).includes(roomID)) {
      return console.warn(`Already joined to ${roomID}`);
    }

    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

    clients.forEach((clientID) => {
      io.to(clientID).emit(EVENTS.ADD_PEER, {
        peerID: socket.id,
        createOffer: false,
      });

      socket.emit(EVENTS.ADD_PEER, {
        peerID: clientID,
        createOffer: true,
      });
    });

    socket.join(roomID);
    updateRoomsData();
  });

  const leaveRoom = () => {
    const { rooms } = socket;

    Array.from(rooms).forEach((roomID) => {
      const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

      clients.forEach((clientID) => {
        io.to(clientID).emit(EVENTS.REMOVE_PEER, {
          peerID: socket.id,
        });

        socket.emit(EVENTS.REMOVE_PEER, {
          peerID: clientID,
        });
      });

      socket.leave(roomID);
    });

    updateRoomsData();
  };

  socket.on(EVENTS.LEAVE_ROOM, leaveRoom);
  socket.on("disconnecting", leaveRoom);

  socket.on(EVENTS.RELAY_SDP, ({peerID, sessionDescription}) => {
    io.to(peerID).emit(EVENTS.SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription
    })
  });

  socket.on(EVENTS.RELAY_ICE, ({peerID, iceCandidate}) => {
    io.to(peerID).emit(EVENTS.ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    })
  })
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Server");
});
