document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".job-duration").forEach(el => {
        const start = new Date(el.dataset.start);
        const end = el.dataset.end ? new Date(el.dataset.end) : new Date();

        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();

        if (end.getDate() < start.getDate()) {
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
