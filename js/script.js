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

  // Sockets
  const socket = io();

  // User state
  let user = {
    isServer: false,
    isClient: false,
    ipClient: "192.168.0.165",
    userCode: "",
    userName: "Uccetta110",
    room: -1,
  };

  let room = {
    code: -1,
    players: [],
    turnIndex: -1,
    turnCode: "",
    time: null,
    state: "not ready",
  };

  let roomList = [];

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
  function updateRoomPlayerCount(roomCode, playerCount) {
    const roomItem = roomsListContainer.querySelector(
      `[data-room-code="${roomCode}"]`
    );
    if (roomItem) {
      const playerInfo = roomItem.querySelector(".room-item-info p");
      if (playerInfo) {
        playerInfo.textContent = `${playerCount} giocator${
          playerCount === 1 ? "e" : "i"
        }`;
      }
    }
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
    const uniqueCode = crypto.randomUUID();
    user.userCode = "user" + uniqueCode;
    console.log(user.userCode);

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
          // TODO: implementare navigazione a game screen
          break;
        case "007":
          // Conferma join stanza esistente
          let roomCodeJoined = msg.slice(msg.indexOf(":") + 1).trim();
          console.log("Joined room successfully: " + roomCodeJoined);
          user.room = roomCodeJoined;
          // Passa alla schermata di gioco
          // TODO: implementare navigazione a game screen
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
        user.isClient = true;
        socket.emit(
          msgName,
          "101 this client ip is:" +
            user.ipClient +
            "| this client code is;" +
            user.userCode
        );
        break;
      case "006":
        // Nuova stanza creata - broadcast a tutti i client
        let roomCode = msg.slice(msg.indexOf(":") + 1).trim();
        console.log("New room broadcast received: " + roomCode);

        // Aggiungi alla lista locale se non presente
        if (!roomList.includes(roomCode)) {
          roomList.push(roomCode);
          console.log("room added in the room list: " + roomCode);

          // Aggiungi alla UI
          addRoomToUI(roomCode, 0);
        }
        break;
      case "008":
        // Aggiornamento conteggio giocatori in una stanza
        let parts = msg.slice(msg.indexOf(":") + 1).split("|");
        let roomCodeUpdate = parts[0].trim();
        let playerCount = parseInt(parts[1].trim());
        console.log(
          "Room " + roomCodeUpdate + " now has " + playerCount + " players"
        );

        // Aggiorna il conteggio nella UI
        updateRoomPlayerCount(roomCodeUpdate, playerCount);
        break;
    }
  });

  initialize();
});
