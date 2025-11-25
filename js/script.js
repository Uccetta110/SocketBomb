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
        ipClient: "192.168.103.41",
        userCode: "",
        userName: "User",
    };

    ServerBtn.addEventListener("click", () => {
        console.log("Server button clicked");
    });

    ClientBtn.addEventListener("click", () => {
        console.log("Client button clicked");
        socket.emit('client test', "test client from "+user.userCode);
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

    socket.on('server message', (msg) => {
        console.log("Message from server: " + msg);
        let msgName = 'client message';

        switch (msg)
        {
            case "Welcome to the server!":
                user.isClient = true;
                socket.emit(msgName, user.ipClient+"| this client ip is " + user.userCode);
            break;
        }
           
    });

    initialize();
});