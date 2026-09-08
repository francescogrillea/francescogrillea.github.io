document.addEventListener("DOMContentLoaded", function () {
    const mount = document.getElementById("mindmap-container");

    if (!mount) {
        return;
    }

    fetch("components/mindmap.html")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Mindmap component failed to load: ${response.status}`);
            }

            return response.text();
        })
        .then(html => {
            mount.innerHTML = html;
            setupReducedMotion(mount);
        })
        .catch(error => console.error("Error loading mindmap:", error));
});

function setupReducedMotion(mount) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function updateMotionState() {
        mount.querySelectorAll(".dt-ecosystem__graph").forEach(graph => {
            try {
                if (reducedMotion.matches && typeof graph.pauseAnimations === "function") {
                    graph.pauseAnimations();
                } else if (!reducedMotion.matches && typeof graph.unpauseAnimations === "function") {
                    graph.unpauseAnimations();
                }
            } catch (error) {
                console.error("Error updating mindmap motion:", error);
            }
        });
    }

    updateMotionState();

    if (typeof reducedMotion.addEventListener === "function") {
        reducedMotion.addEventListener("change", updateMotionState);
    } else if (typeof reducedMotion.addListener === "function") {
        reducedMotion.addListener(updateMotionState);
    }
}
