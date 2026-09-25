const PDFMAKE_URL = "https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js";
const FONT_ROOT = "https://cdn.jsdelivr.net/fontsource/fonts";
const DATABASE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 448 512'%3E%3Cpath fill='%23475569' d='M448 80v48c0 44-100 80-224 80S0 172 0 128V80C0 36 100 0 224 0s224 36 224 80zM0 214c47 34 133 50 224 50s177-16 224-50v90c0 44-100 80-224 80S0 348 0 304v-90zm0 176c47 34 133 50 224 50s177-16 224-50v42c0 44-100 80-224 80S0 476 0 432v-42z'/%3E%3C/svg%3E";
const SOCIAL_ICONS = {
    LinkedIn: "https://cdn.jsdelivr.net/npm/simple-icons@13/icons/linkedin.svg",
    GitHub: "https://cdn.jsdelivr.net/npm/simple-icons@13/icons/github.svg"
};
const PDF_FONTS = {
    Ubuntu: {
        normal: `${FONT_ROOT}/ubuntu@5.3.0/latin-400-normal.ttf`,
        bold: `${FONT_ROOT}/ubuntu@5.3.0/latin-700-normal.ttf`,
        italics: `${FONT_ROOT}/ubuntu@5.3.0/latin-400-normal.ttf`,
        bolditalics: `${FONT_ROOT}/ubuntu@5.3.0/latin-700-normal.ttf`
    },
    JetBrainsMono: {
        normal: `${FONT_ROOT}/jetbrains-mono@5.2.8/latin-400-normal.ttf`,
        bold: `${FONT_ROOT}/jetbrains-mono@5.2.8/latin-600-normal.ttf`,
        italics: `${FONT_ROOT}/jetbrains-mono@5.2.8/latin-400-normal.ttf`,
        bolditalics: `${FONT_ROOT}/jetbrains-mono@5.2.8/latin-600-normal.ttf`
    }
};

const PAGE_URLS = {
    about: "index.html",
    projects: "projects.html",
    research: "research.html",
    education: "education.html"
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN_X = 34;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const SUMMARY_COLUMN_GAP = 12;
const EXPERIENCE_COLUMN_WIDTH = 320;
const CERTIFICATION_COLUMN_WIDTH = CONTENT_WIDTH - SUMMARY_COLUMN_GAP - EXPERIENCE_COLUMN_WIDTH;

// The website rounds its outer panel by 20px and every inner card by 12px;
// CSS pixels map to PDF points at 0.75.
const PANEL_RADIUS = 15;
const CARD_RADIUS = 9;

const DEVICON_VARIANTS = ["original", "original-wordmark", "plain", "plain-wordmark"];

const ICON_SOURCES = {
    amazonwebservices: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
    azure: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg",
    docker: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg",
    git: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg",
    googlecloud: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg",
    hadoop: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/hadoop/hadoop-original.svg",
    html5: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg",
    java: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg",
    javascript: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
    linux: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg",
    matlab: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/matlab/matlab-original.svg",
    mongodb: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg",
    mysql: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg",
    neo4j: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/neo4j/neo4j-original.svg",
    python: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg",
    redis: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg",
    redshift: DATABASE_ICON,
    aws: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
    database: DATABASE_ICON
};

let libraryPromise;
let exportInProgress = false;

export function setupCvDownload(root = document) {
    const button = root.querySelector(".cv-download-button");
    if (!button || button.dataset.ready === "true") return;

    button.dataset.ready = "true";
    button.addEventListener("click", () => downloadCv());
}

async function downloadCv() {
    if (exportInProgress) return;
    exportInProgress = true;
    const status = document.getElementById("cv-download-status");
    const preview = window.open("", "_blank");
    if (status) status.textContent = "Generating CV PDF";

    try {
        const blob = await createCvBlob();
        const url = URL.createObjectURL(blob);
        if (preview) {
            preview.opener = null;
            preview.location.href = url;
        } else {
            window.open(url, "_blank");
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        if (status) status.textContent = "CV PDF opened in a new tab";
    } catch (error) {
        console.error("CV export failed:", error);
        preview?.close();
        if (status) status.textContent = "CV download failed. Please try again.";
    } finally {
        exportInProgress = false;
    }
}

export async function createCvBlob() {
    const [pdfMake, documents] = await Promise.all([
        loadPdfMake(),
        loadPortfolioDocuments()
    ]);
    const model = extractPortfolio(documents);
    const assets = await loadAssets(model);
    const definition = buildDocument(model, assets);

    return new Promise((resolve, reject) => {
        try {
            pdfMake.createPdf(definition).getBlob(resolve);
        } catch (error) {
            reject(error);
        }
    });
}

function loadPdfMake() {
    if (window.pdfMake) return Promise.resolve(window.pdfMake);
    if (libraryPromise) return libraryPromise;

    libraryPromise = loadScript(PDFMAKE_URL)
        .then(() => {
            if (!window.pdfMake) throw new Error("PDF generator did not initialize");
            window.pdfMake.fonts = PDF_FONTS;
            return window.pdfMake;
        });
    return libraryPromise;
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === "true") resolve();
            else {
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
            }
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.defer = true;
        script.addEventListener("load", () => {
            script.dataset.loaded = "true";
            resolve();
        }, { once: true });
        script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
        document.head.appendChild(script);
    });
}

async function loadPortfolioDocuments() {
    const entries = await Promise.all(Object.entries(PAGE_URLS).map(async ([key, url]) => {
        const response = await fetch(absoluteUrl(url), { credentials: "same-origin" });
        if (!response.ok) throw new Error(`Unable to load portfolio content from ${url}`);
        const html = await response.text();
        return [key, new DOMParser().parseFromString(html, "text/html")];
    }));
    return Object.fromEntries(entries);
}

function extractPortfolio(docs) {
    const aboutMain = docs.about.querySelector("main");
    const experienceItems = [...aboutMain.querySelectorAll(".timeline-item")];
    const educationDoc = docs.education;

    return {
        profile: {
            name: text(document.querySelector("sidebar .profile-name")),
            image: absoluteUrl(document.querySelector("sidebar .profile-img-wrapper img").getAttribute("src")),
            details: reorderProfileDetails([...document.querySelectorAll("sidebar .information-wrapper > p")].map(item => ({
                label: text(item.querySelector("strong")).replace(/:$/, ""),
                value: textWithout(item, "strong"),
                href: item.querySelector("a")?.href || null
            }))),
            links: [
                { label: "LinkedIn", url: "https://www.linkedin.com/in/francescogrillea/", icon: SOCIAL_ICONS.LinkedIn },
                { label: "GitHub", url: "https://github.com/francescogrillea", icon: SOCIAL_ICONS.GitHub }
            ]
        },
        about: text(aboutMain.querySelector(":scope > p")),
        experiences: experienceItems.map(extractTimelineItem),
        certifications: [...educationDoc.querySelectorAll(".hex-cell")].map(cell => ({
            title: text(cell.querySelector(".badge-title")),
            subtitle: text(cell.querySelector(".badge-subtitle"))
        })),
        technologies: [...aboutMain.querySelectorAll(".skills-grid .skill-icon")].map(icon => ({
            name: icon.title,
            icon: deviconSource(icon)
        })),
        projects: extractCards(docs.projects),
        research: extractCards(docs.research)
    };
}

function extractTimelineItem(item) {
    return {
        title: text(item.querySelector(".list-title")),
        subtitle: text(item.querySelector(".list-subtitle")),
        details: [...item.querySelectorAll(".timeline-details > li")].map(text)
    };
}

function reorderProfileDetails(details) {
    const mailIndex = details.findIndex(detail => detail.label.toUpperCase() === "MAIL");
    const locationIndex = details.findIndex(detail => detail.label.toUpperCase() === "LOCATION");
    if (mailIndex >= 0 && locationIndex >= 0) {
        [details[mailIndex], details[locationIndex]] = [details[locationIndex], details[mailIndex]];
    }
    return details;
}

function extractCards(doc) {
    return [...doc.querySelectorAll(".project-container")].map(card => {
        const titleElement = card.querySelector(".project-title");
        const link = titleElement.querySelector("a");
        return {
            title: textWithout(titleElement, "a"),
            description: text(card.querySelector(".project-description")),
            link: link?.href || null,
            technologies: [...card.querySelectorAll(".project-technologies > *")].map(element => ({
                name: element.title || element.getAttribute("aria-label") || element.alt || "Technology",
                icon: element.tagName === "IMG" ? element.src : deviconSource(element)
            }))
        };
    });
}

function text(element) {
    return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function textWithout(element, selector) {
    if (!element) return "";
    const clone = element.cloneNode(true);
    clone.querySelectorAll(selector).forEach(node => node.remove());
    return text(clone);
}

function absoluteUrl(value) {
    return new URL(value, window.location.href).href;
}

function deviconSource(element) {
    const className = [...element.classList].find(name => name.startsWith("devicon-"));
    if (className) {
        const iconName = className.replace("devicon-", "");
        const directory = iconName.split("-")[0];
        // The site tints the single-colour "plain" glyphs to match its own palette;
        // the CV shows each brand's official artwork instead.
        const variant = iconName.replace("-plain", "-original");
        return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${directory}/${variant}.svg`;
    }
    if (element.classList.contains("fa-database")) return ICON_SOURCES.database;
    return null;
}

function deviconCandidates(url) {
    const match = url.match(/^(.*\/icons\/([^/]+)\/\2-)(?:original|plain)(?:-wordmark)?\.svg$/);
    if (!match) return [url];
    const alternates = DEVICON_VARIANTS.map(variant => `${match[1]}${variant}.svg`);
    return [url, ...alternates.filter(candidate => candidate !== url)];
}

async function fetchFirstAvailable(candidates) {
    for (const candidate of candidates) {
        const response = await fetch(candidate);
        if (response.ok) return response;
    }
    throw new Error(`No variant available for ${candidates[0]}`);
}

async function loadAssets(model) {
    const urls = new Set([
        model.profile.image,
        ...model.profile.links.map(link => link.icon),
        ...model.technologies.map(item => item.icon),
        ...model.projects.flatMap(item => item.technologies.map(technology => technology.icon))
    ].filter(Boolean));

    const entries = await Promise.all([...urls].map(async url => {
        try {
            const response = await fetchFirstAvailable(deviconCandidates(url));
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("svg") || url.toLowerCase().includes(".svg")) {
                return [url, { svg: await response.text() }];
            }
            const blob = await response.blob();
            const image = url === model.profile.image
                ? await blobToCircularDataUrl(blob)
                : await blobToDataUrl(blob);
            return [url, { image }];
        } catch (error) {
            console.warn(`Could not embed CV asset ${url}:`, error);
            return [url, null];
        }
    }));
    return Object.fromEntries(entries);
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function blobToCircularDataUrl(blob) {
    const source = await blobToDataUrl(blob);
    const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = source;
    });
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(
        image,
        (image.naturalWidth - size) / 2,
        (image.naturalHeight - size) / 2,
        size,
        size,
        0,
        0,
        size,
        size
    );
    return canvas.toDataURL("image/png");
}

function buildDocument(model, assets) {
    // A CV is intentionally exported in the stable light palette, regardless
    // of the interactive website theme selected by the visitor.
    const palette = {
        page: "#F7F9FC", panel: "#FFFFFF", primary: "#0F172A", secondary: "#475569",
        muted: "#7C8AA0", border: "#E2E8F0", accent: "#4F46E5", teal: "#0D9488"
    };

    const section = (title, body, opts = {}) => [
        {
            columns: [
                { text: title, style: "sectionHeading", headlineLevel: 2, width: "auto" },
                { width: "*", canvas: [{ type: "line", x1: 0, y1: 8, x2: opts.lineWidth ?? 380, y2: 8, lineColor: palette.border, lineWidth: 0.7 }] }
            ],
            columnGap: 10,
            margin: [9, 13, 0, 7],
            ...(opts.pageBreak ? { pageBreak: opts.pageBreak } : {})
        },
        ...body
    ];

    const content = [
        // Keep the complete summary on page one, with only the middle sections side by side.
        {
            stack: [
                profileHeader(model.profile, assets, palette),
                ...section("About", [{ text: model.about, style: "bodyText", alignment: "justify", margin: [9, 0, 9, 0] }]),
                {
                    columns: [
                        {
                            stack: section("Experiences", [experienceTimeline(model.experiences, palette, EXPERIENCE_COLUMN_WIDTH)], { lineWidth: 70 }),
                            width: EXPERIENCE_COLUMN_WIDTH
                        },
                        {
                            stack: section("Certifications", certificationList(model.certifications, palette, CERTIFICATION_COLUMN_WIDTH), { lineWidth: 38 }),
                            width: CERTIFICATION_COLUMN_WIDTH
                        }
                    ],
                    columnGap: SUMMARY_COLUMN_GAP
                },
                ...section("Technologies", technologyGrid(model.technologies, assets, palette))
            ],
            unbreakable: true
        },
        ...section("Projects", [projectList(model.projects, assets, palette)], { pageBreak: "before" }),
        ...section("Research", [projectList(model.research, assets, palette)])
    ];

    return {
        info: {
            title: "Francesco Grillea — Curriculum Vitae",
            author: "Francesco Grillea",
            subject: "Artificial Intelligence Engineer portfolio curriculum vitae",
            keywords: "Francesco Grillea, Artificial Intelligence, Data Science, Machine Learning, Deep Learning, Generative AI, Computer Vision, NLP, Software Engineering"
        },
        pageSize: "A4",
        pageMargins: [PAGE_MARGIN_X, 32, PAGE_MARGIN_X, 34],
        background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: PAGE_WIDTH, h: PAGE_HEIGHT, color: palette.page }] }),
        content,
        defaultStyle: { font: "Ubuntu", fontSize: 9.2, lineHeight: 1.22, color: palette.secondary, alignment: "justify" },
        styles: {
            name: { fontSize: 20, bold: true, color: palette.primary },
            sectionHeading: { font: "JetBrainsMono", fontSize: 13, bold: true, color: palette.accent, characterSpacing: 0.8 },
            cardTitle: { fontSize: 10.5, bold: true, color: palette.primary },
            meta: { font: "JetBrainsMono", fontSize: 7.8, color: palette.muted },
            bodyText: { fontSize: 9.2, color: palette.secondary }
        },
        pageBreakBefore(currentNode, followingNodesOnPage) {
            return currentNode.headlineLevel === 2 && followingNodesOnPage.length === 0;
        }
    };
}

function profileHeader(profile, assets, palette) {
    const picture = centeredAsset(assets[profile.image], 94, 94);
    const detailColumns = [[], []];
    profile.details.forEach((detail, index) => {
        detailColumns[index % 2].push(profileDetail(detail, palette));
    });

    return roundedPanel({
        stack: [
            {
                columns: [
                    { text: profile.name, style: "name", headlineLevel: 1 },
                    {
                        columns: profile.links.map(link => ({
                            ...centeredMonochromeAsset(assets[link.icon], 15, 15, palette.accent),
                            link: link.url,
                            width: 21,
                            margin: [0, 2, 5, 0]
                        })),
                        width: "auto"
                    }
                ],
                columnGap: 10,
                margin: [0, 0, 0, 11]
            },
            {
                columns: [
                    { ...picture, width: 108, margin: [0, 0, 12, 0] },
                    {
                        columns: [
                            { stack: detailColumns[0], width: "*" },
                            { stack: detailColumns[1], width: "*" }
                        ],
                        columnGap: 12,
                        margin: [0, 5, 0, 0]
                    }
                ]
            }
        ]
    }, palette, {
        radius: PANEL_RADIUS,
        padding: [15, 14, 15, 14],
        lineWidth: 0.8,
        margin: [0, 0, 0, 7]
    });
}

function profileDetail(detail, palette) {
    return {
        stack: [
            { text: detail.label.toUpperCase(), font: "JetBrainsMono", bold: true, fontSize: 6.6, color: palette.muted, characterSpacing: 0.55 },
            { text: detail.value, link: detail.href, fontSize: 8.2, color: detail.href ? palette.accent : palette.secondary, margin: [0, 1, 0, 6] }
        ]
    };
}

function experienceTimeline(items, palette, width = CONTENT_WIDTH) {
    return card({
        stack: items.map((item, index) => ({
            columns: [
                timelineMarker(index === 0, item.details.length, palette),
                {
                    stack: [
                        { text: item.title, style: "cardTitle", headlineLevel: 3 },
                        { text: item.subtitle, style: "meta", margin: [0, 1, 0, item.details.length ? 4 : 0] },
                        ...(item.details.length ? [{ ul: item.details, fontSize: 8.2, lineHeight: 1.05, margin: [8, 0, 0, 0] }] : [])
                    ]
                }
            ],
            columnGap: 5,
            margin: [0, 0, 0, index === items.length - 1 ? 0 : 8]
        }))
    }, palette, [12, 10, 12, 10], width);
}

function certificationList(items, palette, width = CONTENT_WIDTH) {
    return [card({
        ul: items.map((item, index) => ({
            text: [
                { text: item.title, fontSize: 8.1, bold: true, color: palette.primary },
                { text: `\n${item.subtitle}`, fontSize: 7.4, color: palette.muted }
            ],
            margin: [0, 0, 0, index === items.length - 1 ? 0 : 8]
        })),
        lineHeight: 1.3,
        margin: [7, 0, 0, 0]
    }, palette, [11, 9, 11, 9], width)];
}

function technologyGrid(items, assets, palette, width = CONTENT_WIDTH) {
    const columns = width === CONTENT_WIDTH ? 8 : 4;
    return [card({
        stack: chunk(items, columns).map(row => ({
            columns: padColumns(row.map(item => ({
                stack: [
                    centeredAsset(assets[item.icon], 23, 23),
                    { text: item.name, alignment: "center", fontSize: 6.8, color: palette.secondary, margin: [0, 3, 0, 0] }
                ]
            })), columns),
            columnGap: 6,
            margin: [0, 3, 0, 6],
            unbreakable: true
        }))
    }, palette, [9, 7, 9, 5], width)];
}

function projectList(items, assets, palette) {
    return {
        ul: items.map(item => projectListItem(item, assets, palette)),
        margin: [9, 0, 0, 0]
    };
}

function projectListItem(item, assets, palette) {
    const icons = item.technologies.map(technology => {
        const node = assetNode(assets[technology.icon], 12, 12);
        node.alt = technology.name;
        return node;
    });
    const title = item.link
        ? { text: item.title, link: item.link, decoration: "underline", color: palette.primary }
        : { text: item.title };

    return {
        stack: [
            {
                columns: [
                    { ...title, style: "cardTitle", headlineLevel: 3 },
                    { columns: icons, width: icons.length ? "auto" : 0, columnGap: 4 }
                ],
                columnGap: 8
            },
            { text: item.description, fontSize: 8.7, margin: [0, 3, 0, 0] }
        ],
        margin: [0, 0, 0, 10]
    };
}

function card(content, palette, padding = [9, 7, 9, 7], width = CONTENT_WIDTH) {
    return roundedPanel(content, palette, {
        radius: CARD_RADIUS,
        padding,
        lineWidth: 0.7,
        margin: [0, 0, 0, 6],
        width
    });
}

// pdfmake cannot round table corners, so a panel is a bordered middle row that
// stretches with its content, closed off by two canvas caps carrying the arcs.
function roundedPanel(content, palette, { radius, padding, lineWidth, margin, width = CONTENT_WIDTH }) {
    const [left, top, right, bottom] = padding;
    return {
        stack: [
            panelCap("top", radius, lineWidth, palette, width),
            {
                table: {
                    widths: ["*"],
                    body: [[{
                        ...content,
                        margin: [left, Math.max(top - radius, 0), right, Math.max(bottom - radius, 0)]
                    }]]
                },
                layout: {
                    fillColor: () => palette.panel,
                    vLineColor: () => palette.border,
                    vLineWidth: () => lineWidth,
                    hLineWidth: () => 0,
                    paddingLeft: () => 0,
                    paddingRight: () => 0,
                    paddingTop: () => 0,
                    paddingBottom: () => 0
                }
            },
            panelCap("bottom", radius, lineWidth, palette, width)
        ],
        unbreakable: true,
        margin
    };
}

// Arcs are sampled into polylines because pdfmake repositions canvas shapes by
// offsetting their coordinates, which it cannot do to an SVG `path` string.
function panelCap(edge, radius, lineWidth, palette, width) {
    // pdfmake positions a polyline by mutating its points, so the fill and the
    // stroke each need their own copy of the outline.
    const outline = () => edge === "top"
        ? [
            ...arcPoints(radius, radius, radius, Math.PI, Math.PI * 1.5),
            ...arcPoints(width - radius, radius, radius, Math.PI * 1.5, Math.PI * 2)
        ]
        : [
            ...arcPoints(radius, 0, radius, Math.PI, Math.PI * 0.5),
            ...arcPoints(width - radius, 0, radius, Math.PI * 0.5, 0)
        ];

    return {
        canvas: [
            { type: "rect", x: 0, y: 0, w: width, h: radius, color: palette.page },
            { type: "polyline", points: outline(), closePath: true, color: palette.panel },
            { type: "polyline", points: outline(), lineColor: palette.border, lineWidth }
        ]
    };
}

function arcPoints(centerX, centerY, radius, startAngle, endAngle, segments = 12) {
    return Array.from({ length: segments + 1 }, (_, index) => {
        const angle = startAngle + (endAngle - startAngle) * (index / segments);
        return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
    });
}

function timelineMarker(isCurrent, detailCount, palette) {
    return {
        width: 14,
        canvas: [
            {
                type: "line",
                x1: 6,
                y1: 10,
                x2: 6,
                y2: detailCount ? 66 : 34,
                lineColor: palette.border,
                lineWidth: 0.8
            },
            {
                type: "ellipse",
                x: 6,
                y: 6,
                r1: isCurrent ? 4.5 : 3,
                r2: isCurrent ? 4.5 : 3,
                color: isCurrent ? palette.panel : palette.accent,
                lineColor: palette.accent,
                lineWidth: isCurrent ? 1.7 : 0
            }
        ]
    };
}

function assetNode(asset, fitWidth, fitHeight) {
    if (!asset) return { text: "", width: fitWidth, height: fitHeight };
    if (asset.svg) return { svg: asset.svg, fit: [fitWidth, fitHeight] };
    return { image: asset.image, fit: [fitWidth, fitHeight] };
}

function centeredAsset(asset, fitWidth, fitHeight) {
    return { ...assetNode(asset, fitWidth, fitHeight), alignment: "center" };
}

function centeredMonochromeAsset(asset, fitWidth, fitHeight, color) {
    if (!asset?.svg) return centeredAsset(asset, fitWidth, fitHeight);
    return {
        svg: monochromeSvg(asset.svg, color),
        fit: [fitWidth, fitHeight],
        alignment: "center"
    };
}

function monochromeSvg(svg, color) {
    return svg
        .replace(/\sfill=(['"]).*?\1/gi, "")
        .replace(/\sstroke=(['"]).*?\1/gi, "")
        .replace(/fill\s*:\s*[^;"']+/gi, `fill:${color}`)
        .replace(/stroke\s*:\s*[^;"']+/gi, `stroke:${color}`)
        .replace(/<svg\b/i, `<svg fill="${color}" stroke="${color}"`);
}

function chunk(items, size) {
    const rows = [];
    for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
    return rows;
}

function padColumns(columns, size) {
    const result = [...columns];
    while (result.length < size) result.push({ text: "" });
    return result;
}
