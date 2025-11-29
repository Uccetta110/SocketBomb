document.addEventListener("DOMContentLoaded", () => {
  // HTML elements
  const ServerBtn = document.getElementById("serverBtn");
  const ClientBtn = document.getElementById("clientBtn");

  // Sockets
  const socket = io();

  // User state
  let user = {
    isServer: false,
    isClient: false,
    ipClient: "192.168.0.165",
    userCode: "",
    userName: "User",
  };

  ServerBtn.addEventListener("click", () => {
    console.log("Server button clicked");
  });

  ClientBtn.addEventListener("click", () => {
    console.log("Client button clicked");
    socket.emit("client test", "test client from " + user.userCode);
    console.log("Client miniscript loaded");
  });

  const initialize = () => {
    // Generate a unique user code
    const uniqueCode = crypto.randomUUID();
    user.userCode = "user" + uniqueCode;
    console.log(user.userCode);

    //ipClient
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
          "002 this client ip is:" +
            user.ipClient +
            "| this client code is;" +
            user.userCode
        );
        break;
      case "003":
    }
  });

  socket.on("server message|" + user.userCode, (msg) => {
    let msgName = "client message|"+user.userCode;
    switch (msg.slice(0, 3)) {
      case "003":
        msg = msg.slice(4);
        let pp = msg.indexOf(":");
        let ipClient = msg.slice(pp + 1).trim();

        if (ipClient == user.ipClient)
            socket.emit()

        break;
    }
  });

  initialize();
});
