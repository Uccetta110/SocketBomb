document.addEventListener("DOMContentLoaded", () => {
    //elementi html
    const ServerBtn = document.getElementById("serverBtn");
    const ClientBtn = document.getElementById("clientBtn");

    //script elementi html
    ServerBtn.addEventListener("click", () => {
        console.log("Server button clicked");
    });

    ClientBtn.addEventListener("click", () => {
        console.log("Client button clicked");
    });
});