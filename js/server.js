const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let users = [];

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
    console.log("Client test message received:", msg);
    // Optionally, broadcast the message to all clients
    io.emit("server response", `Server received: ${msg}`);
  });

  socket.on("client message", (msg) => {
    console.log("Message from client: " + msg);
    let msgName = "server message";

    switch (msg.slice(0,3)) {
      case "002":
        msg = msg.slice(4);
        let pp = msg.indexOf(":");
        let pipe = msg.indexOf("|");
        let pv = msg.indexOf(";");
        let ipClient = msg.slice(pp + 1, pipe).trim();
        let userCode = msg.slice(pv + 1).trim();
        let user = {
          ipClient: ipClient,
          userCode: userCode,
        };
        console.log("Registered new user:", user);
        users.push(user);
        io.emit("server message|"+user.userCode, "003 is your IP:" + user.ipClient);
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
