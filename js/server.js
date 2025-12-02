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
        addUser(msg, socket);
        break;
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
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
  let userCode = msg.slice(msg.indexOf(";") + 1).trim();
  let user = {
    ipClient: ipClient,
    userCode: userCode,
    username: "",
    room: -1,
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
          socket.emit(msgName, "201 user not found");
          return;
        }
        target.userName = userName;
        socket.emit(msgName, "003 userName saved:" + userName);
        break;
      case "301":
        let ipClient = msg.slice(msg.indexOf(":") + 1).trim();
        target.ipClient = ipClient;
        io.emit(msgName, "002 is your IP:" + ipClient);
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
        socket.emit(msgName, "004 new userName saved:" + target.userName);
        let userRoomList = getUserRoomList();
        socket.emit(msgName, "008 roomUpdate:"+JSON.stringify(userRoomList));
        break;
      case "104":
        let roomCode = msg.slice(msg.indexOf(":") + 1).trim();
        let roomTarget = findRoom(roomCode);
        
        // Verifica se l'utente è già in una stanza
        if (target.room !== -1) {
          console.log("User " + target.userName + " is already in room " + target.room);
          socket.emit(msgName, "201 already in a room");
          return;
        }
        
        let isNewRoom = false;
        
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
          socket.emit(msgName, "005 room created:" + roomCode);
          // Broadcast a tutti i client della nuova stanza
          let userRoomTargetList = getUserRoomList();
          io.emit("server message", "006 new room:" + JSON.stringify(userRoomTargetList));
        } else {
          // Stanza esistente - verifica che non sia già dentro
          const alreadyInRoom = roomTarget.players.some(p => p.userCode === target.userCode);
          if (alreadyInRoom) {
            console.log("User " + target.userName + " already in this room");
            socket.emit(msgName, "201 already in this room");
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
          socket.emit(msgName, "007 joined room:" + roomCode);
        }
        
        target.room = roomCode;
        roomTarget.players.push(target);
        roomTarget.playerCount += 1;
        console.log(
          "The user " + target.userName + " joined the room " + roomCode
        );
        
        // Broadcast aggiornamento conteggio giocatori
        let TuserRoomList = getUserRoomList();
        socket.emit("server message", "008 roomUpdate:"+JSON.stringify(TuserRoomList));
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

function findRoom(roomCode) {
  const target = rooms.find((r) => r.code == roomCode);
  if (!target) {
    console.log("room with " + roomCode + " not found ");
    return null;
  }

  return target;
}

function addRoom(roomCode, socket) {
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

function getUserRoomList(){
  let userRoomList = [];
  rooms.forEach((room) => {
    let tRoom = {
      code: room.code,
      playerCount: room.playerCount
    };
    userRoomList.push(tRoom); 
  });
  return userRoomList;
}

function updateRoomsToPlayers(socket){

}
