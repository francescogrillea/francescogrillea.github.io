document.addEventListener("DOMContentLoaded", function () {
    fetch("sidebar.html")
        .then(response => response.text())
        .then(data => {
            const sidebar = document.getElementById("sidebar-container");
            sidebar.innerHTML = data;
            sidebar.classList.add("is-visible");
        })
        .catch(error => console.error("Error loading aside:", error));
});
