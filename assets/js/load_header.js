document.addEventListener("DOMContentLoaded", function () {
    const header = document.getElementById("header-container");

    fetch("header.html")
        .then(response => response.text())
        .then(data => {
            header.innerHTML = data;
            markActiveLink(header);
            setupThemeToggle(header);
            header.classList.add("is-visible");
        })
        .catch(error => console.error("Error loading header:", error));
});

/* Highlight the link matching the current page. */
function markActiveLink(header) {
    const page = window.location.pathname.split("/").pop() || "index.html";

    header.querySelectorAll(".nav-link").forEach(link => {
        if (link.getAttribute("href") === page) {
            link.classList.add("active");
        }
    });
}

function setupThemeToggle(header) {
    const button = header.querySelector("#theme-toggle");
    const icon = button.querySelector("i");
    const root = document.documentElement;

    const syncIcon = () => {
        const dark = root.classList.contains("dark-mode");
        icon.classList.toggle("fa-sun", dark);
        icon.classList.toggle("fa-moon", !dark);
    };

    syncIcon();

    button.addEventListener("click", () => {
        const applyTheme = () => {
            const dark = root.classList.toggle("dark-mode");
            localStorage.setItem("theme", dark ? "dark" : "light");
            syncIcon();
        };

        if (!document.startViewTransition) {
            applyTheme();
            return;
        }

        document.startViewTransition(applyTheme);
    });
}
