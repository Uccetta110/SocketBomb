const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = [];
let rooms = [];

// Serve static files from the "html" folder
app.use(express.static(path.join(__dirname, "../")));

// Route to serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../html", "index.html"));
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected");
  io.emit("server message", "001 Welcome to the server!");

  // Handle client test event
  socket.on("client test", (msg) => {
    const code = msg.slice(msg.indexOf(":") + 1);
    const user = findUser(code);
    msg.replace(":", ": ");
    msg += " | IP address: " + user.ipClient + " | userName: " + user.userName;
    console.log("Client test message received:", msg);

    // Optionally, broadcast the message to all clients
    io.emit("server response", `Server received: ${msg}`);
  });

  socket.on("client message", (msg) => {
    console.log("Message from client: " + msg);
    let msgName = "server message";
    msgCode = msg.slice(0, 3);
    msg = msg.slice(4);
    switch (msgCode) {
      case "101":
        addUser(msg, socket, socket.id);
        break;
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    const target = findUserFromId(socket.id);
    console.log(
      "Utente disconnesso: " +
        target.userName +
        " userCode: " +
        target.userCode +
        " Motivo: " +
        reason
    );
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ===========================================================================================
// |                                                                                         |
// |                                                                                         |
// ===========================================================================================
function addUser(msg, socket) {
  let ipClient = msg.slice(msg.indexOf(":") + 1, msg.indexOf("|")).trim();
  let userCode = msg.slice(msg.indexOf(";") + 1, msg.indexOf("!")).trim();
  let userAvatar = msg.slice(msg.indexOf("§") + 1).trim();
  const target = findUser(userCode);
  if (target.userCode != "notfound") {
    target.online = true;
    return;
  }
  let user = {
    ipClient: ipClient,
    userCode: userCode,
    socketid: socket.id,
    online: true,
    username: "",
    room: -1,
    avatar: userAvatar,
  };
  users.push(user);
  console.log("Registered new user:", users[users.length - 1]);
  io.emit("server message|" + userCode, "002 is your IP:" + user.ipClient);

  socket.on("client message|" + userCode, (msg) => {
    const UserCode = userCode;
    console.log("Message from client " + UserCode + ": " + msg);
    let msgName = "server message|" + UserCode;
    msgCode = msg.slice(0, 3);
    msg = msg.slice(4);
    const target = users.find((u) => u.userCode == UserCode);

    switch (msgCode) {
      case "102":
        let userName = msg.slice(msg.indexOf(":") + 1).trim();

        if (!target) {
          console.log(`User with code ${UserCode} not found`);
          io.emit(msgName, "201 user not found");
          return;
        }
        changeUserName(userName, userCode, target);

        break;
      case "103":
        let userNameChaged = msg.slice(msg.indexOf(":") + 1).trim();
        target.userName = userNameChaged;
        console.log(
          "The new username for the usercode " +
            UserCode +
            " is " +
            userNameChaged
        );
        io.emit(msgName, "004 new userName saved:" + target.userName);
        updateRoomsToAllPlayers();
        break;
      case "104":
        let roomCode = msg.slice(msg.indexOf(":") + 1).trim();
        let roomTarget = findRoom(roomCode);

        // Verifica se l'utente è già in una stanza
        if (target.room !== -1) {
          console.log(
            "User " + target.userName + " is already in room " + target.room
          );
          io.emit(msgName, "201 already in a room");
          return;
        }

        if (!roomTarget) {
          // Stanza nuova - creala
          roomTarget = addRoom(roomCode, socket);
          isNewRoom = true;
          console.log(
            "Room " +
              roomCode +
              " created by order of " +
              target.userName +
              " | " +
              target.userCode
          );

          // Conferma personale al creatore
          io.emit(msgName, "005 room created:" + roomCode);
          // Broadcast a tutti i client della nuova stanza
        } else {
          // Stanza esistente - verifica che non sia già dentro
          const alreadyInRoom = roomTarget.players.some(
            (p) => p.userCode === target.userCode
          );
          if (alreadyInRoom) {
            console.log("User " + target.userName + " already in this room");
            io.emit(msgName, "201 already in this room");
            return;
          }

          console.log(
            "Room " +
              roomCode +
              " already existing, asked by " +
              target.userName +
              " | " +
              target.userCode
          );
          // Conferma personale a chi fa join
          io.emit(msgName, "007 joined room:" + roomCode);
        }

        target.room = roomCode;
        roomTarget.players.push(target);
        roomTarget.playerCount += 1;
        console.log(
          "The user " + target.userName + " joined the room " + roomCode
        );

        updateRoomsToAllPlayers();
        updateRoomInfo(roomTarget);
        break;
      case "301":
        let ipClient = msg.slice(msg.indexOf(":") + 1).trim();
        target.ipClient = ipClient;
        io.emit(msgName, "002 is your IP:" + ipClient);
        break;
      case "302":
        if (!target.roomCode) {
          io.emit(msgName, "010 you are not in any room");
        } else sendRoomInfoToUser(target);
        break;
      case "303":
        if (!target.roomCode) {
          io.emit(msgName, "010 you are not in any room");
        } else sendRoomInfoToUser(target);
        break;
    }
  });
}

function findUser(userCode) {
  const target = users.find((u) => u.userCode == userCode);
  if (!target) {
    console.log("user with " + userCode + " not found ");
    return {
      userCode: "notfound",
      ipClient: "notfound",
      userName: "notfound",
    };
  }

  return target;
}

function findUserFromId(socketid) {
  const target = users.find((u) => u.socketid == socketid);
  if (!target) {
    console.log("user with socketid:" + socketid + " not found ");
    return {
      userCode: "notfound",
      ipClient: "notfound",
      userName: "notfound",
      socketid: "notfound",
    };
  }

  return target;
}

function findRoom(roomCode) {
  const target = rooms.find((r) => r.code == roomCode);
  if (!target) {
    console.log("room with " + roomCode + " not found ");
    return null;
  }

  return target;
}

function addRoom(roomCode) {
  let room = {
    code: roomCode,
    players: [],
    playerCount: 0,
    turnIndex: -1,
    turnCode: "",
    time: null,
    state: "not ready",
  };

  rooms.push(room);
  console.log("Registered new room:", rooms[rooms.length - 1]);

  return findRoom(roomCode);
}

function getUserRoomList() {
  let userRoomList = [];
  rooms.forEach((room) => {
    let tRoom = {
      code: room.code,
      playerCount: room.playerCount,
    };
    userRoomList.push(tRoom);
  });
  return userRoomList;
}

function updateRoomsToAllPlayers() {
  let userRoomList = getUserRoomList();
  io.emit("server message", "008 roomUpdate:" + JSON.stringify(userRoomList));
}

function updateRoomInfo(roomTarget) {
  roomTarget.players.forEach((player) => {
    const target = findUser(player.userCode);
    sendRoomInfoToUser(target);
  });
}

function sendRoomInfoToUser(target) {
  let roomTarget = findRoom(target.room);
  io.emit(
    "server message|" + target.userCode,
    "009 user room details:" + JSON.stringify(roomTarget)
  );
}

function changeUserName(userName, userCode, target) {
  target.userName = userName;
  io.emit("server message|" + userCode, "003 userName saved:" + userName);
  if (target.room != -1) {
    let room = findRoom(target.room);
    const targetInRoom = room.players.find((r) => r.userCode == userCode);
    targetInRoom.userName = userName;
  }
}

async function disconnectedUser(target) {
  target.online = false;
  let timer = 30;
  while (time > 0) {
    await sleep(1000);
    if (target.online == true) {
      return;
    }
    timer--;
  }
  if (target.room != -1) {
    let room = findRoom(target.room);
    const index = room.players.findIndex((r) => r.userCode == target.userCode);
    if (index !== -1) {
      room.players.splice(index, 1);
      room.playerCount -= 1;
      updateRoomInfo(room);
    }
  }
  io.emit(
    "server message",
    "011 broadcast user disconnection:" + target.userCode
  );
}

// ===========================================================================================
// |                                                                                         |
// |                                                                                         |
// ===========================================================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
