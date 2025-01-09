document.addEventListener("DOMContentLoaded", function () {
    fetch("aside.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("aside-container").innerHTML = data;
        })
        .catch(error => console.error("Error loading aside:", error));
});
