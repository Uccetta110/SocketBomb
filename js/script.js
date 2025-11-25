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
        userCode: "",
        userName: "User",
    };

    ServerBtn.addEventListener("click", () => {
        console.log("Server button clicked");
    });

    ClientBtn.addEventListener("click", () => {
        console.log("Client button clicked");
        socket.emit('client test', "test message from client");
        console.log("Client miniscript loaded");
    });

    const initialize = () => {
        const uniqueCode = crypto.randomUUID();
        console.log("Document has been opened and initialized.");
        user.userCode = "user" + uniqueCode;
        console.log(user.userCode);
    };

    initialize();
});