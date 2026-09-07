document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".job-duration").forEach(el => {
        const start = new Date(el.dataset.start);
        const now = new Date();

        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();

        if (now.getDate() < start.getDate()) {
            months--;
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const parts = [];
        if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
        if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);

        el.textContent = parts.length ? ` (${parts.join(", ")})` : "";
    });
});
