const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = [];
let rooms = [];

// Serve static files
app.use(express.static(path.join(__dirname, "../")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../html", "index.html"));
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected");
  io.emit("server message", "001 Welcome to the server!");

  socket.on("client test", (msg) => {
    const code = msg.slice(msg.indexOf(":") + 1);
    const user = findUser(code);
    msg.replace(":", ": ");
    msg += " | IP address: " + user.ipClient + " | userName: " + user.userName;
    console.log("Client test message received:", msg);
    io.emit("server response", `Server received: ${msg}`);
  });

  socket.on("client message", (msg) => {
    console.log("Message from client: " + msg);
    msgCode = msg.slice(0, 3);
    msg = msg.slice(4);
    switch (msgCode) {
      case "101":
        addUser(msg, socket, socket.id);
        break;
    }
  });

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
    disconnectedUser(target);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ===========================================================================================
// |                                    USER MANAGEMENT                                      |
// ===========================================================================================

function addUser(msg, socket) {
  let ipClient = msg.slice(msg.indexOf(":") + 1, msg.indexOf("|")).trim();
  let userCode = msg.slice(msg.indexOf(";") + 1, msg.indexOf("!")).trim();
  let userAvatar = msg.slice(msg.indexOf("§") + 1, msg.indexOf("@")).trim();
  let userSocketid = msg.slice(msg.indexOf("£") + 1).trim();
  const target = findUser(userCode);
  
  if (target.userCode != "notfound") {
    if (target.online == true) {
      io.emit("server message|" + target.userCode, "012 the user with this socketid needs to be eliminated:" + userSocketid);
      return;
    }
    target.online = true;
    target.socketid = socket.id;
    console.log("User " + target.userName + " | " + target.userCode + " reconnected");
    sendRoomInfoToUser(target);
    registerUserListeners(target.userCode, socket);
    return;
  }
  
  let user = {
    ipClient: ipClient,
    userCode: userCode,
    socketid: socket.id,
    online: true,
    userName: "",
    room: -1,
    avatar: userAvatar,
    timeConnected: new Date(),
    ready: false,
  };
  
  users.push(user);
  console.log("Registered new user:", users[users.length - 1]);
  io.emit("server message|" + userCode, "002 is your IP:" + user.ipClient);
  
  registerUserListeners(userCode, socket);
}

function registerUserListeners(userCode, socket) {
  socket.on("client message|" + userCode, (msg) => {
    console.log("Message from client " + userCode + ": " + msg);
    let msgName = "server message|" + userCode;
    msgCode = msg.slice(0, 3);
    msg = msg.slice(4);
    const target = users.find((u) => u.userCode == userCode);

    switch (msgCode) {
      case "102":
        let userName = msg.slice(msg.indexOf(":") + 1).trim();
        if (!target) {
          console.log(`User with code ${userCode} not found`);
          io.emit(msgName, "201 user not found");
          return;
        }
        changeUserName(userName, userCode, target);
        break;
        
      case "103":
        let userNameChanged = msg.slice(msg.indexOf(":") + 1).trim();
        target.userName = userNameChanged;
        console.log("The new username for the usercode " + userCode + " is " + userNameChanged);
        io.emit(msgName, "004 new userName saved:" + target.userName);
        updateRoomsToAllPlayers();
        break;
        
      case "104":
        let roomCode = msg.slice(msg.indexOf(":") + 1).trim();
        joinOrCreateRoom(target, roomCode, msgName);
        break;
        
      case "105": // Leave room
        leaveRoom(target);
        break;
        
      case "106": // Toggle ready
        toggleReady(target);
        break;
        
      case "107": // Start game (admin only)
        startGame(target);
        break;
        
      case "108": // Kick player (admin only)
        let kickUserCode = msg.slice(msg.indexOf(":") + 1).trim();
        kickPlayer(target, kickUserCode);
        break;
        
      case "109": // Letter typed
        let letterIndex = parseInt(msg.slice(msg.indexOf(":") + 1).trim());
        handleLetterTyped(target, letterIndex);
        break;
        
      case "110": // Letter error (penalità)
        handleLetterError(target);
        break;
        
      case "301":
        let ipClient = msg.slice(msg.indexOf(":") + 1).trim();
        target.ipClient = ipClient;
        io.emit(msgName, "002 is your IP:" + ipClient);
        break;
        
      case "302":
      case "303":
        if (!target.room || target.room === -1) {
          io.emit(msgName, "010 you are not in any room");
        } else {
          sendRoomInfoToUser(target);
        }
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

function changeUserName(userName, userCode, target) {
  target.userName = userName;
  io.emit("server message|" + userCode, "003 userName saved:" + userName);
  if (target.room != -1) {
    let room = findRoom(target.room);
    const targetInRoom = room.players.find((r) => r.userCode == userCode);
    if (targetInRoom) {
      targetInRoom.userName = userName;
      updateRoomInfo(room);
    }
  }
}

async function disconnectedUser(target) {
  if (target.userCode === "notfound") return;
  
  target.online = false;
  let timer = 60;
  
  while (timer > 0) {
    await sleep(1000);
    if (target.online == true) {
      return;
    }
    timer--;
  }
  
  if (target.room != -1) {
    let room = findRoom(target.room);
    if (room) {
      removePlayerFromRoom(room, target.userCode, true);
    }
  }
  
  io.emit("server message", "011 broadcast user disconnection:" + target.userCode);
}

// ===========================================================================================
// |                                    ROOM MANAGEMENT                                      |
// ===========================================================================================

function findRoom(roomCode) {
  const target = rooms.find((r) => r.code == roomCode);
  if (!target) {
    console.log("room with " + roomCode + " not found ");
    return null;
  }
  return target;
}

function addRoom(roomCode, adminUserCode) {
  let room = {
    code: roomCode,
    players: [],
    playerCount: 0,
    adminUserCode: adminUserCode,
    turnIndex: -1,
    turnCode: "",
    bombTimer: 30,
    letterTimer: 3000,
    currentSequence: [],
    sequenceLength: 3,
    roundNumber: 1,
    state: "waiting", // waiting, ready, playing, ended
    gameInterval: null,
    currentLetterIndex: 0,
    lastLetterTime: 0,
  };

  rooms.push(room);
  console.log("Registered new room:", rooms[rooms.length - 1]);
  return findRoom(roomCode);
}

function joinOrCreateRoom(target, roomCode, msgName) {
  if (target.room !== -1) {
    console.log("User " + target.userName + " is already in room " + target.room);
    io.emit(msgName, "201 already in a room");
    return;
  }

  let roomTarget = findRoom(roomCode);
  let isNewRoom = false;

  if (!roomTarget) {
    roomTarget = addRoom(roomCode, target.userCode);
    isNewRoom = true;
    console.log("Room " + roomCode + " created by " + target.userName);
    io.emit(msgName, "005 room created:" + roomCode);
  } else {
    if (roomTarget.state === "playing") {
      io.emit(msgName, "202 game already started");
      return;
    }
    
    const alreadyInRoom = roomTarget.players.some((p) => p.userCode === target.userCode);
    if (alreadyInRoom) {
      console.log("User " + target.userName + " already in this room");
      io.emit(msgName, "201 already in this room");
      return;
    }
    
    console.log("User " + target.userName + " joining room " + roomCode);
    io.emit(msgName, "007 joined room:" + roomCode);
  }

  target.room = roomCode;
  target.ready = false;
  roomTarget.players.push(target);
  roomTarget.playerCount += 1;
  
  console.log("User " + target.userName + " joined room " + roomCode);
  
  updateRoomsToAllPlayers();
  updateRoomInfo(roomTarget);
}

function leaveRoom(target) {
  if (target.room === -1) {
    io.emit("server message|" + target.userCode, "010 you are not in any room");
    return;
  }

  let room = findRoom(target.room);
  if (!room) return;

  removePlayerFromRoom(room, target.userCode, false);
  target.room = -1;
  target.ready = false;
  
  io.emit("server message|" + target.userCode, "013 you left the room");
  updateRoomsToAllPlayers();
}

function removePlayerFromRoom(room, userCode, isDisconnect) {
  const index = room.players.findIndex((r) => r.userCode == userCode);
  if (index === -1) return;

  room.players.splice(index, 1);
  room.playerCount -= 1;

  // Se era il turno del giocatore rimosso e il gioco è attivo
  if (room.state === "playing" && room.turnCode === userCode) {
    nextTurn(room);
  }

  // Se era l'admin, assegna un nuovo admin
  if (room.adminUserCode === userCode && room.playerCount > 0) {
    room.adminUserCode = room.players[0].userCode;
  }

  // Se la stanza è vuota, rimuovila
  if (room.playerCount === 0) {
    const roomIndex = rooms.findIndex((r) => r.code === room.code);
    if (roomIndex !== -1) {
      if (room.gameInterval) clearInterval(room.gameInterval);
      rooms.splice(roomIndex, 1);
      console.log("Room " + room.code + " removed (empty)");
    }
  } else {
    updateRoomInfo(room);
  }

  if (isDisconnect) {
    io.emit("server message", "011 broadcast user disconnection:" + userCode);
  }
}

function toggleReady(target) {
  if (target.room === -1) {
    io.emit("server message|" + target.userCode, "010 you are not in any room");
    return;
  }

  let room = findRoom(target.room);
  if (!room) return;

  if (room.state === "playing") {
    io.emit("server message|" + target.userCode, "203 game already started");
    return;
  }

  target.ready = !target.ready;
  const playerInRoom = room.players.find((p) => p.userCode === target.userCode);
  if (playerInRoom) {
    playerInRoom.ready = target.ready;
  }

  console.log("User " + target.userName + " ready status: " + target.ready);
  updateRoomInfo(room);
}

function kickPlayer(admin, kickUserCode) {
  if (admin.room === -1) return;

  let room = findRoom(admin.room);
  if (!room) return;

  if (room.adminUserCode !== admin.userCode) {
    io.emit("server message|" + admin.userCode, "204 you are not admin");
    return;
  }

  if (admin.userCode === kickUserCode) {
    io.emit("server message|" + admin.userCode, "205 cannot kick yourself");
    return;
  }

  const kickedUser = findUser(kickUserCode);
  if (kickedUser.userCode === "notfound") return;

  io.emit("server message|" + kickUserCode, "014 you were kicked from room");
  
  kickedUser.room = -1;
  kickedUser.ready = false;
  removePlayerFromRoom(room, kickUserCode, false);
  
  console.log("User " + kickedUser.userName + " kicked by admin");
  updateRoomsToAllPlayers();
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
  if (!roomTarget) return;
  
  // Crea una copia della room senza gameInterval (non serializzabile)
  const roomData = {
    code: roomTarget.code,
    players: roomTarget.players,
    playerCount: roomTarget.playerCount,
    adminUserCode: roomTarget.adminUserCode,
    turnIndex: roomTarget.turnIndex,
    turnCode: roomTarget.turnCode,
    bombTimer: roomTarget.bombTimer,
    letterTimer: roomTarget.letterTimer,
    currentSequence: roomTarget.currentSequence,
    sequenceLength: roomTarget.sequenceLength,
    roundNumber: roomTarget.roundNumber,
    state: roomTarget.state,
  };
  
  io.emit(
    "server message|" + target.userCode,
    "009 user room details:" + JSON.stringify(roomData)
  );
}

// ===========================================================================================
// |                                    GAME LOGIC                                           |
// ===========================================================================================

function startGame(admin) {
  if (admin.room === -1) return;

  let room = findRoom(admin.room);
  if (!room) return;

  if (room.adminUserCode !== admin.userCode) {
    io.emit("server message|" + admin.userCode, "204 you are not admin");
    return;
  }

  if (room.playerCount < 2) {
    io.emit("server message|" + admin.userCode, "206 need at least 2 players");
    return;
  }

  const allReady = room.players.every((p) => p.ready);
  if (!allReady) {
    io.emit("server message|" + admin.userCode, "207 not all players ready");
    return;
  }

  console.log("Starting game in room " + room.code);
  room.state = "playing";
  room.turnIndex = 0;
  room.bombTimer = 30;
  room.letterTimer = 3000;
  room.sequenceLength = 3;
  room.roundNumber = 1;
  
  startNewRound(room);
  updateRoomInfo(room); // Invia l'aggiornamento completo della room
}

function startNewRound(room) {
  if (room.playerCount === 1) {
    endGame(room, room.players[0].userCode);
    return;
  }

  room.turnCode = room.players[room.turnIndex].userCode;
  room.currentSequence = generateLetterSequence(room.sequenceLength);
  room.bombTimer = 30;
  room.currentLetterIndex = 0;
  room.lastLetterTime = Date.now();
  
  // Calcola il timer per lettera basato sul round
  const baseTime = 3000;
  const reduction = Math.floor((room.roundNumber - 1) / 3) * 500;
  room.letterTimer = Math.max(1000, baseTime - reduction);

  console.log("Round " + room.roundNumber + " - Turn: " + room.turnCode + " - Sequence: " + room.currentSequence.join(""));
  console.log("Room state:", room.state);
  
  broadcastGameState(room);
  startBombTimer(room);
}

function generateLetterSequence(length) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let sequence = [];
  for (let i = 0; i < length; i++) {
    sequence.push(letters.charAt(Math.floor(Math.random() * letters.length)));
  }
  return sequence;
}

function startBombTimer(room) {
  if (room.gameInterval) {
    clearInterval(room.gameInterval);
  }

  room.gameInterval = setInterval(() => {
    room.bombTimer -= 1;
    
    // Controlla se il giocatore sta impiegando troppo tempo sulla lettera corrente
    const timeSinceLastLetter = Date.now() - room.lastLetterTime;
    if (timeSinceLastLetter >= room.letterTimer && room.currentLetterIndex < room.currentSequence.length) {
      console.log(`Player took too long on letter ${room.currentLetterIndex + 1}! Penalty: -5 seconds`);
      
      // Penalità: toglie 5 secondi dal timer della bomba e resetta la sequenza
      room.bombTimer = Math.max(0, room.bombTimer - 5);
      room.currentLetterIndex = 0; // Reset alla prima lettera
      room.lastLetterTime = Date.now(); // Reset il timer per evitare penalità multiple
      
      // Notifica tutti i giocatori del timeout
      const currentPlayer = findUser(room.turnCode);
      if (currentPlayer.userCode !== "notfound") {
        io.emit("server message|" + currentPlayer.userCode, "021 letter timeout");
      }
      
      // Se il timer scende a 0 o meno, bomba esplode
      if (room.bombTimer <= 0) {
        clearInterval(room.gameInterval);
        explodeBomb(room);
        return;
      }
      
      broadcastGameState(room);
      return;
    }
    
    if (room.bombTimer <= 0) {
      clearInterval(room.gameInterval);
      explodeBomb(room);
    } else {
      broadcastGameState(room);
    }
  }, 1000);
}

function handleLetterTyped(target, letterIndex) {
  if (target.room === -1) return;

  let room = findRoom(target.room);
  if (!room || room.state !== "playing") return;

  if (room.turnCode !== target.userCode) {
    io.emit("server message|" + target.userCode, "208 not your turn");
    return;
  }

  console.log(`Player ${target.userName} typed letter ${letterIndex}/${room.currentSequence.length}`);
  
  // Aggiorna il progresso sul server
  room.currentLetterIndex = letterIndex;
  room.lastLetterTime = Date.now();

  // Se ha completato la sequenza
  if (letterIndex >= room.currentSequence.length) {
    console.log(`Player ${target.userName} completed the sequence! Passing bomb...`);
    nextTurn(room);
  }
}

function handleLetterError(target) {
  if (target.room === -1) return;

  let room = findRoom(target.room);
  if (!room || room.state !== "playing") return;

  if (room.turnCode !== target.userCode) return;

  // Applica penalità di 0.5 secondi e resetta la sequenza
  room.bombTimer = Math.max(1, room.bombTimer - 1);
  room.currentLetterIndex = 0; // Reset alla prima lettera
  room.lastLetterTime = Date.now(); // Reset il timer
  
  console.log(`Player ${target.userName} made an error! Penalty applied. Timer: ${room.bombTimer}s. Sequence reset.`);
  
  // Notifica il client di resettare la sequenza
  io.emit("server message|" + target.userCode, "020 sequence reset");
  
  broadcastGameState(room);
}

function nextTurn(room) {
  if (room.gameInterval) {
    clearInterval(room.gameInterval);
  }

  room.turnIndex = (room.turnIndex + 1) % room.playerCount;
  
  // Aumenta la difficoltà ogni 3 turni completi
  const totalTurns = room.roundNumber;
  if (totalTurns > 0 && totalTurns % (room.playerCount * 3) === 0) {
    room.sequenceLength += 1;
  }
  
  room.roundNumber += 1;
  startNewRound(room);
}

function explodeBomb(room) {
  const loserUserCode = room.turnCode;
  const loser = findUser(loserUserCode);
  
  console.log("BOOM! " + loser.userName + " lost!");
  
  // Notifica l'esplosione
  room.players.forEach((player) => {
    io.emit("server message|" + player.userCode, "016 bomb exploded:" + loserUserCode);
  });

  // Rimuovi il perdente dopo un delay per l'animazione
  setTimeout(() => {
    // Rimuovi il perdente dalla stanza ma non dalla lista users
    removePlayerFromRoom(room, loserUserCode, false);
    loser.room = -1;
    loser.ready = false;
    
    io.emit("server message|" + loserUserCode, "017 you lost, eliminated");
    
    // Controlla se il gioco deve continuare
    if (room.playerCount === 1) {
      endGame(room, room.players[0].userCode);
    } else if (room.playerCount > 1) {
      room.turnIndex = room.turnIndex % room.playerCount;
      room.roundNumber += 1;
      startNewRound(room);
    }
    // Nota: Non eliminiamo più la stanza anche se vuota dopo la vittoria
    
    updateRoomsToAllPlayers();
  }, 2000);
}

function endGame(room, winnerUserCode) {
  if (room.gameInterval) {
    clearInterval(room.gameInterval);
  }

  room.state = "ended";
  const winner = findUser(winnerUserCode);
  
  console.log("Game ended! Winner: " + winner.userName);
  
  // Notifica tutti i giocatori (solo il vincitore è ancora nella room)
  io.emit("server message|" + winnerUserCode, "018 game ended, winner:" + winnerUserCode);

  // Reset room dopo 5 secondi - il vincitore rimane nella stanza
  setTimeout(() => {
    room.state = "waiting";
    room.turnIndex = -1;
    room.turnCode = "";
    room.bombTimer = 30;
    room.currentSequence = [];
    room.sequenceLength = 3;
    room.roundNumber = 1;
    room.currentLetterIndex = 0;
    room.lastLetterTime = 0;
    
    // Il vincitore rimane nella stanza e può giocare di nuovo
    room.players.forEach((p) => {
      p.ready = false;
      const user = findUser(p.userCode);
      if (user.userCode !== "notfound") {
        user.ready = false;
      }
    });
    
    console.log("Room " + room.code + " reset. Winner " + winner.userName + " stays in room.");
    updateRoomInfo(room);
    updateRoomsToAllPlayers();
  }, 5000);
}

function broadcastGameState(room) {
  const gameState = {
    turnCode: room.turnCode,
    bombTimer: room.bombTimer,
    letterTimer: room.letterTimer,
    currentSequence: room.currentSequence,
    roundNumber: room.roundNumber,
  };
  
  console.log("Broadcasting game state - turnCode:", room.turnCode, "sequence:", room.currentSequence.join(""));
  
  room.players.forEach((player) => {
    console.log("Sending to player:", player.userCode, "isTheirTurn:", player.userCode === room.turnCode);
    io.emit("server message|" + player.userCode, "019 game state:" + JSON.stringify(gameState));
  });
}

// ===========================================================================================
// |                                    UTILITIES                                            |
// ===========================================================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}