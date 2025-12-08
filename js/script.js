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
  const gameContainter = document.getElementById("game-screen");
  const roomIdLabel = document.getElementById("currentRoomName");
  const playersListContainer = document.getElementById("playersList");

  // Sockets
  const socket = io();

  //test
  const testing = false;

  // User state
  let user = {
    ipClient: "192.168.0.165",
    userCode: "",
    userName: "Uccetta110",
    room: -1,
    avatar: "avatar1",
  };

  let room = {
    code: -1,
    players: [],
    playerCount: 0,
    turnIndex: -1,
    turnCode: "",
    time: null,
    state: "not ready",
  };

  var roomList = [];

  // Funzione per aggiungere una stanza alla UI
  function addRoomToUI(roomCode, playerCount = 0) {
    // Rimuovi il messaggio "Nessuna stanza disponibile" se presente
    const emptyMsg = roomsListContainer.querySelector(".empty-rooms");
    if (emptyMsg) {
      emptyMsg.remove();
    }

    // Crea l'elemento della stanza
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

    // Aggiungi listener al bottone Unisciti
    const joinBtn = roomItem.querySelector(".join-room-btn");
    joinBtn.addEventListener("click", () => {
      console.log("Joining room:", roomCode);
      room.code = roomCode;
      socket.emit(
        "client message|" + user.userCode,
        "104 join room code:" + roomCode
      );
      roomScreen.classList.remove("active");
      gameContainter.classList.add("active");
    });

    roomsListContainer.appendChild(roomItem);
  }

  // Funzione per aggiornare il conteggio giocatori di una stanza
  function updateRooms() {
    while (roomsListContainer.firstChild) {
      roomsListContainer.removeChild(roomsListContainer.firstChild);
    }
    roomList.forEach((room) => {
      addRoomToUI(room.code, room.playerCount);
    });
  }

  // Funzione per aggiornare la lista giocatori nella game screen
  function updatePlayersListUpdate() {
    console.log("updatePlayerList");
    if (!room.players) {
      console.log("l'array room.players non esiste");
    } else if (!Array.isArray(room.players)) {
      console.log("l'array room.players non è un array");
    }
    const players = room.players;
    console.log("Updating players list with:", players);

    // Svuota la lista esistente
    while (playersListContainer.firstChild) {
      playersListContainer.removeChild(playersListContainer.firstChild);
    }

    // Aggiungi ogni giocatore
    players.forEach((player) => {
      const playerCard = document.createElement("div");
      playerCard.className = "player-card";
      playerCard.dataset.userCode = player.userCode;

      // Aggiungi classe 'active' se è il turno del giocatore
      if (room.turnCode === player.userCode) {
        playerCard.classList.add("active");
      }

      const avatarPath = `../assets/images/avatars/${
        player.avatar || "avatar1"
      }.png`;
      const playerName = player.userName || "Giocatore";

      playerCard.innerHTML = `
        <img src="${avatarPath}" alt="${playerName}" class="player-avatar" onerror="this.src='../assets/images/avatars/avatar1.png'" />
        <div class="player-name">${playerName}</div>
      `;

      playersListContainer.appendChild(playerCard);
    });
  }

  ServerBtn.addEventListener("click", () => {
    console.log("Server button clicked");
  });

  ClientBtn.addEventListener("click", () => {
    console.log("Client button clicked");
    socket.emit("client test", "test client from:" + user.userCode);
    console.log("Client miniscript loaded");
  });

  UserConfirmButton.addEventListener("click", () => {
    let username = usernameInput.value.trim();
    if (username.length <= 0) {
      username = user.userCode.slice(0, 12);
    }
    console.log("Username Confirm button clicked, username: " + username);
    user.userName = username;
    document.cookie = "userName=" + username + "; max-age=86400; path=/";

    // Aggiorna il nome visualizzato nella schermata stanze
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
      roomCode = 1;
    }
    console.log("Room Confirm button clicked, room code: " + roomCode);
    room.code = roomCode;
    socket.emit(
      "client message|" + user.userCode,
      "104 join room code:" + room.code
    );
  });

  const initialize = () => {
    // Generate a unique user code
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

    if (userName == null || testing) {
    } else {
      user.userName = userName;
      displayUsername.textContent = userName;

      socket.emit(
        "client message|" + user.userCode,
        "103 my new username is:" + userName
      );
      usernameScreen.classList.remove("active");
      roomScreen.classList.add("active");
    }

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
          } else socket.emit(msgName, "301 no, my ip is:" + user.ipClient);
          break;
        case "005":
          // Conferma creazione stanza personale
          let roomCodeCreated = msg.slice(msg.indexOf(":") + 1).trim();
          console.log("Room created successfully: " + roomCodeCreated);
          user.room = roomCodeCreated;
          // Passa alla schermata di gioco
          enterRoom();
          break;
        case "007":
          // Conferma join stanza esistente
          let roomCodeJoined = msg.slice(msg.indexOf(":") + 1).trim();
          console.log("Joined room successfully: " + roomCodeJoined);
          user.room = roomCodeJoined;
          // Passa alla schermata di gioco
          roomScreen.classList.remove("active");
          gameContainter.classList.add("active");
          break;
        case "009":
          let sroom = msg.slice(msg.indexOf(":") + 1).trim();
          console.log("room updated by the server: " + sroom);
          if (sroom) {
            try {
              const roomData = JSON.parse(sroom);
              room = roomData;
              console.log("Room data updated:", room);

              // Aggiorna l'interfaccia
              updateRoom();
            } catch (error) {
              console.error("Invalid JSON received:", sroom, error);
              socket.emit(msgName, "303 JSON room not valid:" + sroom);
            }
          } else {
            console.error("Empty room data received");
            socket.emit(msgName, "302 room empty");
          }
          break;
      }
    });

    //Final log
    console.log("Document has been opened and initialized.");
  };

  socket.on("server message", (msg) => {
    console.log("Message from server: " + msg);
    let msgName = "client message";

    switch (msg.slice(0, 3)) {
      case "001":
        socket.emit(
          msgName,
          "101 this client ip is:" +
            user.ipClient +
            "| this client code is;" +
            user.userCode +
            "! this client avatar is§" +
            user.avatar
        );
        break;
      case "006":
        // Nuova stanza creata - broadcast a tutti i client
        let sroom = msg.slice(msg.indexOf(":") + 1).trim();
        console.log("New room broadcast received: " + sroom);
        let troom;
        try {
          troom = JSON.parse(sroom);
        } catch (error) {
          console.error("Invalid JSON received:", sroom);
          return; // Esci dalla funzione se il JSON non è valido
        }

        // Aggiungi alla lista locale se non presente
        if (!roomList) {
          roomList.push(troom);
          console.log("room added in the room list: " + sroom);

          // Aggiungi alla UI
        } else if (!roomList.includes(roomCode)) {
          roomList.push(roomCode);
          console.log("room added in the room list: " + roomCode);

          // Aggiungi alla UI
        }
        updateRooms();
        break;
      case "008":
        // Aggiornamento conteggio giocatori in una stanza
        let sroomList = msg.slice(msg.indexOf(":") + 1).trim();
        console.log("Room list received:", sroomList);

        try {
          roomList = JSON.parse(sroomList);
          console.log("Rooms updated:", roomList);
          updateRooms();
        } catch (error) {
          console.error(
            "Error parsing room list JSON:",
            error,
            "Data:",
            sroomList
          );
        }
        break;
    }
  });

  function enterRoom() {
    roomScreen.classList.remove("active");
    gameContainter.classList.add("active");
    roomIdLabel.textContent = room.code;
  }

  function updateRoom() {
    roomIdLabel.textContent = room.code;

    // Aggiorna la lista giocatori se disponibile
    updatePlayersListUpdate();
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
});
