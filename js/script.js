document.addEventListener("DOMContentLoaded", () => {
    //elementi html
    const ServerBtn = document.getElementById("serverBtn");
    const ClientBtn = document.getElementById("clientBtn");

    //Stato user
    let user = {
        isServer: false,
        isClient: false,
        userCode: "",
        userName: "User",
    }
    ServerBtn.addEventListener("click", () => {
        console.log("Server button clicked");
    });

    ClientBtn.addEventListener("click", () => {
        console.log("Client button clicked");
    });

    const initialize = () => {
        const uniqueCode = crypto.randomUUID();

        ;
        console.log("Document has been opened and initialized.");
        user.userCode = "user"+uniqueCode;
        console.log(user.userCode)
    };

    initialize();
});