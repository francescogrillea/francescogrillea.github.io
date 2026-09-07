/* Reveals the page shell in stages (main box, then its content) and plays a
   short fade-out before internal navigations, so the real-navigation reload
   between pages reads as an intentional transition instead of a stall. */
(function () {
    const CHILD_STAGGER_MS = 60;
    const LEAVE_DURATION_MS = 120;

    function revealMain() {
        const main = document.querySelector("main");
        if (!main) return;

        requestAnimationFrame(() => main.classList.add("is-visible"));

        Array.from(main.children).forEach((el, i) => {
            setTimeout(() => el.classList.add("is-visible"), 100 + i * CHILD_STAGGER_MS);
        });
    }

    function isInternalNavLink(link) {
        if (!link || link.target === "_blank") return false;

        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;

        return link.origin === window.location.origin;
    }

    function setupLeaveTransition() {
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a");
            if (!isInternalNavLink(link)) return;

            event.preventDefault();
            document.body.classList.add("is-leaving");
            setTimeout(() => {
                window.location.href = link.href;
            }, LEAVE_DURATION_MS);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", revealMain);
    } else {
        revealMain();
    }

    setupLeaveTransition();
})();
