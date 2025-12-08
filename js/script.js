document.addEventListener("DOMContentLoaded", () => {
  // HTML elements
  const ServerBtn = document.getElementById("serverBtn");
  const ClientBtn = document.getElementById("clientBtn");
  const UserConfirmButton = document.getElementById("setUsernameBtn");
  const usernameInput = document.getElementById("usernameInput");
  const RoomConfirmButton = document.getElementById("createRoomBtn");
  const roomInput = document.getElementById("roomInput");
  const usernameScreen = document.getElementById("username-screen");
  const roomScreen = document.getElementById("room-list-screen");
  const roomsListContainer = document.getElementById("roomsList");
  const displayUsername = document.getElementById("displayUsername");
  const gameContainer = document.getElementById("game-screen");
  const roomIdLabel = document.getElementById("currentRoomName");
  const playersListContainer = document.getElementById("playersList");
  const leaveRoomBtn = document.getElementById("leaveRoomBtn");
  const readyBtn = document.getElementById("readyBtn");
  const startGameBtn = document.getElementById("startGameBtn");
  const bombIndicator = document.getElementById("bombIndicator");
  const timerDisplay = document.getElementById("timerDisplay");
  const turnIndicator = document.getElementById("turnIndicator");
  const letterSequence = document.getElementById("letterSequence");
  const timingIndicator = document.getElementById("timingIndicator");
  const typingFeedback = document.getElementById("typingFeedback");

  // Sockets
  const socket = io();

  // Test mode
  const testing = false;

  // User state
  let user = {
    ipClient: "192.168.0.165",
    userCode: "",
    userName: "Guest",
    socketid: "",
    isConnected: false,
    room: -1,
    avatar: "avatar1",
    ready: false,
  };

  let room = {
    code: -1,
    players: [],
    playerCount: 0,
    adminUserCode: "",
    turnIndex: -1,
    turnCode: "",
    bombTimer: 30,
    letterTimer: 3000,
    currentSequence: [],
    sequenceLength: 3,
    roundNumber: 1,
    state: "waiting",
  };

  let gameState = {
    currentLetterIndex: 0,
    letterStartTime: 0,
    isMyTurn: false,
    typedCorrectly: true,
    letterTimerInterval: null,
  };

  let roomList = [];

  socket.on("connect", () => {
    console.log("socketID:", socket.id);
    user.socketid = socket.id;
  });

  // ===========================================================================================
  // |                                    UI FUNCTIONS                                         |
  // ===========================================================================================

  function addRoomToUI(roomCode, playerCount = 0) {
    const emptyMsg = roomsListContainer.querySelector(".empty-rooms");
    if (emptyMsg) {
      emptyMsg.remove();
    }

    const roomItem = document.createElement("div");
    roomItem.className = "room-item";
    roomItem.dataset.roomCode = roomCode;

    roomItem.innerHTML = `
      <div class="room-item-info">
        <h3>${roomCode}</h3>
        <p>${playerCount} giocator${playerCount === 1 ? "e" : "i"}</p>
      </div>
      <button class="btn-primary join-room-btn" data-room="${roomCode}">
        Unisciti
      </button>
    `;

    const joinBtn = roomItem.querySelector(".join-room-btn");
    joinBtn.addEventListener("click", () => {
      console.log("Joining room:", roomCode);
      socket.emit(
        "client message|" + user.userCode,
        "104 join room code:" + roomCode
      );
    });

    roomsListContainer.appendChild(roomItem);
  }

  function updateRooms() {
    while (roomsListContainer.firstChild) {
      roomsListContainer.removeChild(roomsListContainer.firstChild);
    }

    if (roomList.length === 0) {
      roomsListContainer.innerHTML = `
        <div class="empty-rooms">
          <p>Nessuna stanza disponibile</p>
          <p class="hint">Crea la prima stanza!</p>
        </div>
      `;
    } else {
      roomList.forEach((room) => {
        addRoomToUI(room.code, room.playerCount);
      });
    }
  }

  function updatePlayersListUpdate() {
    console.log("updatePlayerList");
    if (!room.players || !Array.isArray(room.players)) {
      console.log("Invalid room.players array");
      return;
    }

    const players = room.players;
    console.log("Updating players list with:", players);

    while (playersListContainer.firstChild) {
      playersListContainer.removeChild(playersListContainer.firstChild);
    }

    players.forEach((player) => {
      const playerCard = document.createElement("div");
      playerCard.className = "player-card";
      playerCard.dataset.userCode = player.userCode;

      if (room.state === "playing" && room.turnCode === player.userCode) {
        playerCard.classList.add("active");
      }

      if (player.ready && room.state === "waiting") {
        playerCard.classList.add("ready");
      }

      const avatarPath = `../assets/images/avatars/${
        player.avatar || "avatar1"
      }.png`;
      const playerName = player.userName || "Giocatore";
      const isAdmin = player.userCode === room.adminUserCode;
      const statusText = player.ready
        ? "Pronto"
        : isAdmin
        ? "Admin"
        : "In attesa";

      playerCard.innerHTML = `
        <img src="${avatarPath}" alt="${playerName}" class="player-avatar" onerror="this.src='../assets/images/avatars/avatar1.png'" />
        <div class="player-name">${playerName}</div>
        <div class="player-status">${statusText}</div>
      `;

      // Aggiungi bottone kick se sei admin e non è te stesso
      if (
        user.userCode === room.adminUserCode &&
        player.userCode !== user.userCode &&
        room.state === "waiting"
      ) {
        const kickBtn = document.createElement("button");
        kickBtn.className = "btn-secondary small";
        kickBtn.textContent = "Rimuovi";
        kickBtn.style.marginTop = "8px";
        kickBtn.onclick = () => {
          socket.emit(
            "client message|" + user.userCode,
            "108 kick player:" + player.userCode
          );
        };
        playerCard.appendChild(kickBtn);
      }

      playersListContainer.appendChild(playerCard);
    });
  }

  function updateGameUI() {
    // Aggiorna timer bomba
    timerDisplay.textContent = room.bombTimer + "s";

    // Aggiorna indicatore turno
    if (room.state === "playing") {
      const currentPlayer = room.players.find(
        (p) => p.userCode === room.turnCode
      );
      if (currentPlayer) {
        console.log("updateGameUI - user.userCode:", user.userCode, "room.turnCode:", room.turnCode);
        gameState.isMyTurn = (room.turnCode === user.userCode);
        console.log("updateGameUI - isMyTurn:", gameState.isMyTurn);
        if (gameState.isMyTurn) {
          turnIndicator.textContent = "È il tuo turno! Digita le lettere!";
          console.log("updateGameUI: È il tuo turno, sequenza:", room.currentSequence.join(""));
        } else {
          turnIndicator.textContent = `Turno di ${currentPlayer.userName}`;
        }
      }
    } else if (room.state === "waiting") {
      turnIndicator.textContent = "In attesa di giocatori...";
      gameState.isMyTurn = false;
    }

    // Aggiorna sequenza lettere
    displayLetterSequence();

    // Aggiorna lista giocatori
    updatePlayersListUpdate();

    // Aggiorna bottoni
    updateButtons();
  }

  function displayLetterSequence() {
    letterSequence.innerHTML = "";

    if (room.currentSequence.length === 0) {
      return;
    }

    room.currentSequence.forEach((letter, index) => {
      const letterDiv = document.createElement("div");
      letterDiv.className = "letter";
      letterDiv.textContent = letter;

      if (index < gameState.currentLetterIndex) {
        // Lettere già digitate
        letterDiv.classList.add("typed");
      } else if (index === gameState.currentLetterIndex && gameState.isMyTurn) {
        // Lettera corrente da digitare
        letterDiv.classList.add("current");
      }

      letterSequence.appendChild(letterDiv);
    });
  }

  function updateButtons() {
    if (room.state === "waiting") {
      readyBtn.style.display = "block";
      readyBtn.textContent = user.ready ? "Annulla Pronto" : "Pronto!";
      readyBtn.disabled = false;

      startGameBtn.style.display =
        user.userCode === room.adminUserCode ? "block" : "none";
      startGameBtn.disabled = false;
    } else if (room.state === "playing") {
      readyBtn.style.display = "none";
      startGameBtn.style.display = "none";
    }
  }

  function animateExplosion() {
    bombIndicator.classList.add("exploding");
    setTimeout(() => {
      bombIndicator.classList.remove("exploding");
    }, 600);
  }

  function showFeedback(message, type = "info") {
    typingFeedback.textContent = message;
    typingFeedback.style.color =
      type === "error" ? "#dc2626" : type === "success" ? "#15803d" : "#64748b";
  }

  function updateTimingBar() {
    if (!gameState.isMyTurn || room.state !== "playing") {
      timingIndicator.style.width = "0%";
      return;
    }

    const elapsed = Date.now() - gameState.letterStartTime;
    const percentage = Math.max(0, 100 - (elapsed / room.letterTimer) * 100);

    timingIndicator.style.width = percentage + "%";

    if (percentage > 50) {
      timingIndicator.className = "timing-fill";
    } else if (percentage > 25) {
      timingIndicator.className = "timing-fill warning";
    } else {
      timingIndicator.className = "timing-fill danger";
    }
  }

  // ===========================================================================================
  // |                                    EVENT LISTENERS                                      |
  // ===========================================================================================

  ServerBtn.addEventListener("click", () => {
    console.log("Server button clicked");
  });

  ClientBtn.addEventListener("click", () => {
    console.log("Client button clicked");
    socket.emit("client test", "test client from:" + user.userCode);
  });

  UserConfirmButton.addEventListener("click", () => {
    let username = usernameInput.value.trim();
    if (username.length <= 0) {
      username = user.userCode.slice(0, 12);
    }
    console.log("Username Confirm button clicked, username: " + username);
    user.userName = username;
    document.cookie = "userName=" + username + "; max-age=86400; path=/";

    displayUsername.textContent = username;

    socket.emit(
      "client message|" + user.userCode,
      "103 my new username is:" + username
    );
    usernameScreen.classList.remove("active");
    roomScreen.classList.add("active");
  });

  RoomConfirmButton.addEventListener("click", () => {
    let roomCode = roomInput.value.trim();
    if (roomCode.length <= 0) {
      alert("Inserisci un nome per la stanza!");
      return;
    }
    console.log("Room Confirm button clicked, room code: " + roomCode);
    socket.emit(
      "client message|" + user.userCode,
      "104 join room code:" + roomCode
    );
  });

  leaveRoomBtn.addEventListener("click", () => {
    if (confirm("Sei sicuro di voler uscire dalla stanza?")) {
      socket.emit("client message|" + user.userCode, "105 leave room");
    }
  });

  readyBtn.addEventListener("click", () => {
    socket.emit("client message|" + user.userCode, "106 toggle ready");
  });

  startGameBtn.addEventListener("click", () => {
    socket.emit("client message|" + user.userCode, "107 start game");
  });

  // Gestione input tastiera
  document.addEventListener("keydown", (e) => {
    console.log("KEYDOWN - key:", e.key, "isMyTurn:", gameState.isMyTurn, "room.state:", room.state);
    
    if (!gameState.isMyTurn || room.state !== "playing") {
      console.log("Input bloccato - isMyTurn:", gameState.isMyTurn, "state:", room.state);
      return;
    }
    if (gameState.currentLetterIndex >= room.currentSequence.length) {
      console.log("Sequenza già completata");
      return;
    }

    const expectedLetter = room.currentSequence[gameState.currentLetterIndex];
    const typedLetter = e.key.toUpperCase();

    console.log(`Lettera ${gameState.currentLetterIndex + 1}/${room.currentSequence.length} - Premuto: '${typedLetter}', Atteso: '${expectedLetter}'`);

    if (typedLetter === expectedLetter) {
      // Lettera corretta
      gameState.currentLetterIndex++;
      gameState.letterStartTime = Date.now();

      displayLetterSequence();
      
      const remaining = room.currentSequence.length - gameState.currentLetterIndex;
      if (remaining > 0) {
        showFeedback(`✓ Corretto! Ancora ${remaining} letter${remaining === 1 ? 'a' : 'e'}`, "success");
      } else {
        showFeedback("✓ Sequenza completata! Bomba passata!", "success");
      }

      // Notifica il server del progresso
      socket.emit(
        "client message|" + user.userCode,
        "109 letter typed:" + gameState.currentLetterIndex
      );

      // Se ha completato la sequenza, aspetta il server per il cambio turno
      if (gameState.currentLetterIndex >= room.currentSequence.length) {
        console.log("Sequenza completata! Aspetto il cambio turno dal server...");
      }
    } else if (/^[A-Z]$/.test(typedLetter)) {
      // Lettera sbagliata - solo se è una lettera dell'alfabeto
      const letters = letterSequence.querySelectorAll(".letter");
      if (letters[gameState.currentLetterIndex]) {
        letters[gameState.currentLetterIndex].classList.add("error");
        setTimeout(() => {
          letters[gameState.currentLetterIndex].classList.remove("error");
        }, 300);
      }
      showFeedback(`✗ Sbagliato! Devi premere '${expectedLetter}'`, "error");
      
      // Notifica il server dell'errore (penalità)
      socket.emit(
        "client message|" + user.userCode,
        "110 letter error"
      );
    }
  });

  // Timer update loop
  setInterval(() => {
    if (gameState.isMyTurn && room.state === "playing") {
      updateTimingBar();
    }
  }, 100);

  // ===========================================================================================
  // |                                    SOCKET HANDLERS                                      |
  // ===========================================================================================

  const initialize = () => {
    const userCode = getCookie("userCode");
    const userName = getCookie("userName");

    if (userCode == null || testing) {
      const uniqueCode = crypto.randomUUID();
      user.userCode = "user" + uniqueCode;
    } else {
      user.userCode = userCode;
    }
    console.log(user.userCode);
    document.cookie = "userCode=" + user.userCode + "; max-age=86400; path=/";

    const avatar = "avatar" + (Math.floor(Math.random() * 17) + 1);
    user.avatar = avatar;
    roomList = [];

    if (userName != null && testing) {
      user.userName = userName;
      displayUsername.textContent = userName;

      socket.emit(
        "client message|" + user.userCode,
        "103 my new username is:" + userName
      );
      usernameScreen.classList.remove("active");
      roomScreen.classList.add("active");
    }
    roomScreen.classList.remove("active");
    usernameScreen.classList.add("active");

    socket.on("server message|" + user.userCode, (msg) => {
      console.log("Message from server with user: " + msg);
      let msgName = "client message|" + user.userCode;

      switch (msg.slice(0, 3)) {
        case "002":
          msg = msg.slice(4);
          let pp = msg.indexOf(":");
          let ipClient = msg.slice(pp + 1).trim();
          if (ipClient == user.ipClient) {
            socket.emit(
              msgName,
              "102 yes, that's my ip, here's my user name:" + user.userName
            );
          } else {
            socket.emit(msgName, "301 no, my ip is:" + user.ipClient);
          }
          user.isConnected = true;
          break;
        case "005":
        case "007":
          let roomCodeJoined = msg.slice(msg.indexOf(":") + 1).trim();
          console.log("Joined/Created room: " + roomCodeJoined);
          user.room = roomCodeJoined;
          break;
        case "009":
          let sroom = msg.slice(msg.indexOf(":") + 1).trim();
          console.log("Room updated by server: " + sroom);
          if (sroom) {
            try {
              const roomData = JSON.parse(sroom);
              room = roomData;
              console.log("Room data updated:", room);
              enterRoom();
              updateGameUI();
            } catch (error) {
              console.error("Invalid JSON received:", sroom, error);
            }
          }
          break;
        case "012":
          let socketid = msg.slice(msg.indexOf(":") + 1).trim();
          if (user.socketid == socketid) {
            userReset();
          }
          break;
        case "013":
          // Left room
          user.room = -1;
          user.ready = false;
          gameContainer.classList.remove("active");
          roomScreen.classList.add("active");
          break;
        case "014":
          // Kicked from room
          alert("Sei stato rimosso dalla stanza dall'amministratore");
          user.room = -1;
          user.ready = false;
          gameContainer.classList.remove("active");
          roomScreen.classList.add("active");
          break;
        case "016":
          // Bomb exploded
          let loserCode = msg.slice(msg.indexOf(":") + 1).trim();
          animateExplosion();
          const loser = room.players.find((p) => p.userCode === loserCode);
          if (loser) {
            showFeedback(
              `💥 BOOM! ${loser.userName} è stato eliminato!`,
              "error"
            );
          }
          break;
        case "017":
          // You lost
          alert("Sei stato eliminato! La bomba è esplosa nelle tue mani!");
          user.room = -1;
          user.ready = false;
          gameContainer.classList.remove("active");
          roomScreen.classList.add("active");
          break;
        case "018":
          // Game ended
          let winnerCode = msg.slice(msg.indexOf(":") + 1).trim();
          const winner = room.players.find((p) => p.userCode === winnerCode);
          if (winner) {
            alert(`🎉 ${winner.userName} ha vinto la partita!`);
          }
          break;
        case "019":
          // Game state update
          let gameStateStr = msg.slice(msg.indexOf(":") + 1).trim();
          try {
            const newGameState = JSON.parse(gameStateStr);
            const wasMyturn = gameState.isMyTurn;
            const previousTurnCode = room.turnCode;
            
            room.bombTimer = newGameState.bombTimer;
            room.letterTimer = newGameState.letterTimer;
            room.currentSequence = newGameState.currentSequence;
            room.roundNumber = newGameState.roundNumber;

            // Reset game state SOLO quando cambia il turno
            if (previousTurnCode !== newGameState.turnCode) {
              console.log("Cambio turno da", previousTurnCode, "a", newGameState.turnCode);
              room.turnCode = newGameState.turnCode;
              gameState.currentLetterIndex = 0;
              gameState.letterStartTime = Date.now();
              gameState.typedCorrectly = true;
            } else {
              // Aggiorna solo il turnCode senza resettare il progresso
              room.turnCode = newGameState.turnCode;
            }
            
            // Aggiorna isMyTurn
            console.log("DEBUG - user.userCode:", user.userCode);
            console.log("DEBUG - room.turnCode:", room.turnCode);
            console.log("DEBUG - Confronto:", user.userCode === room.turnCode);
            gameState.isMyTurn = (room.turnCode === user.userCode);
            
            if (gameState.isMyTurn && !wasMyturn) {
              console.log("È il tuo turno! Sequenza:", room.currentSequence.join(""));
              showFeedback("È il tuo turno! Inizia a digitare!", "info");
            } else {
              console.log("Non è il tuo turno. isMyTurn:", gameState.isMyTurn);
            }

            updateGameUI();
          } catch (error) {
            console.error("Invalid game state JSON:", error);
          }
          break;
      }
    });

    console.log("Document initialized.");
  };

  socket.on("server message", (msg) => {
    console.log("Message from server: " + msg);
    let msgName = "client message";

    switch (msg.slice(0, 3)) {
      case "001":
        if (user.isConnected == true) {
          return;
        }
        socket.emit(
          msgName,
          "101 this client ip is:" +
            user.ipClient +
            "| this client code is;" +
            user.userCode +
            "! this client avatar is§" +
            user.avatar +
            "@ this client socketid is£" +
            user.socketid
        );
        break;
      case "006":
        let sroom = msg.slice(msg.indexOf(":") + 1).trim();
        console.log("New room broadcast received: " + sroom);
        try {
          const troom = JSON.parse(sroom);
          if (!roomList.find((r) => r.code === troom.code)) {
            roomList.push(troom);
          }
          updateRooms();
        } catch (error) {
          console.error("Invalid JSON received:", sroom);
        }
        break;
      case "008":
        let sroomList = msg.slice(msg.indexOf(":") + 1).trim();
        console.log("Room list received:", sroomList);
        try {
          roomList = JSON.parse(sroomList);
          console.log("Rooms updated:", roomList);
          updateRooms();
        } catch (error) {
          console.error("Error parsing room list JSON:", error);
        }
        break;
      case "011":
        let userCode = msg.slice(msg.indexOf(":") + 1).trim();
        const index = room.players.findIndex((r) => r.userCode == userCode);
        if (index !== -1) {
          room.players.splice(index, 1);
          room.playerCount -= 1;
          updateGameUI();
        }
        break;
    }
  });

  function enterRoom() {
    roomScreen.classList.remove("active");
    gameContainer.classList.add("active");
    roomIdLabel.textContent = room.code;
    gameState.currentLetterIndex = 0;
    gameState.isMyTurn = false;
  }

  function getCookie(name) {
    const cookies = document.cookie.split("; ");
    for (let cookie of cookies) {
      const [key, value] = cookie.split("=");
      if (key === name) return value;
    }
    return null;
  }

  initialize();

  function userReset() {
    console.log("User reset");

    socket.off("server message|" + user.userCode);

    user = {
      ipClient: "192.168.0.165",
      userCode: "",
      userName: "Guest",
      socketid: user.socketid,
      isConnected: false,
      room: -1,
      avatar: "avatar1",
      ready: false,
    };

    const uniqueCode = crypto.randomUUID();
    user.userCode = "user" + uniqueCode;
    document.cookie = "userCode=" + user.userCode + "; max-age=86400; path=/";

    const avatar = "avatar" + (Math.floor(Math.random() * 17) + 1);
    user.avatar = avatar;

    room = {
      code: -1,
      players: [],
      playerCount: 0,
      adminUserCode: "",
      turnIndex: -1,
      turnCode: "",
      bombTimer: 30,
      letterTimer: 3000,
      currentSequence: [],
      sequenceLength: 3,
      roundNumber: 1,
      state: "waiting",
    };

    roomList = [];

    gameContainer.classList.remove("active");
    roomScreen.classList.remove("active");
    usernameScreen.classList.add("active");

    socket.emit(
      "client message",
      "101 this client ip is:" +
        user.ipClient +
        "| this client code is;" +
        user.userCode +
        "! this client avatar is§" +
        user.avatar +
        "@ this client socketid is£" +
        user.socketid
    );

    initialize();
  }
});
