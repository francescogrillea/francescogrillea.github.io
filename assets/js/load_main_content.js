document.addEventListener("DOMContentLoaded", function () {
    fetch("about.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("content-container").innerHTML = data;
        })
        .catch(error => console.error("Error loading aside:", error));
});
