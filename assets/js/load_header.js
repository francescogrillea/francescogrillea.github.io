document.addEventListener("DOMContentLoaded", function () {
    const header = document.getElementById("header-container");

    fetch("header.html")
        .then(response => response.text())
        .then(data => {
            header.innerHTML = data;
            markActiveLink(header);
            setupThemeToggle(header);
            setupScrollShrink(header);
            header.classList.add("is-visible");
        })
        .catch(error => console.error("Error loading header:", error));
});

/* Shrinks the header on scroll-down, restores it on the slightest scroll-up
   (hovering restores it too, but that part is pure CSS). Reads scroll
   position at most once per animation frame so fast scrolling can't pile up
   layout work and cause jitter. */
function setupScrollShrink(header) {
    const SHOW_AT_TOP = 40;
    const DOWN_DELTA = 8;
    const UP_DELTA = 4;

    let lastY = window.scrollY;
    let ticking = false;

    function update() {
        const y = window.scrollY;
        const diff = y - lastY;

        if (y <= SHOW_AT_TOP) {
            header.classList.remove("is-compact");
        } else if (diff > DOWN_DELTA) {
            header.classList.add("is-compact");
        } else if (diff < -UP_DELTA) {
            header.classList.remove("is-compact");
        }

        lastY = y;
        ticking = false;
    }

    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
}

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
