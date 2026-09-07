const https = require("https");
const http = require("http");
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index("rag", process.env.PINECONE_INDEX_HOST);

const BASE = "https://www.statefarm.com";
const MAX_PAGES = 200;
const DELAY_MS = 500;

// Only crawl relevant sections
const ALLOWED_PATHS = [
    "/insurance/",
    "/financial-services/",
    "/claims/",
    "/discounts/",
    "/about/",
    "/simple-insights/",
];

const visited = new Set();
const queue = [
    "/insurance/renters",
    "/insurance/auto",
    "/insurance/life",
    "/insurance/health",
    "/insurance/home-and-property",
    "/insurance/motorcycle",
    "/insurance/boat",
    "/insurance/pet",
    "/insurance/business",
    "/insurance/disability",
    "/insurance/supplemental-health",
    "/financial-services/annuities",
    "/financial-services/mutual-funds",
    "/claims",
    "/discounts",
    "/simple-insights/insurance",
    "/simple-insights/auto-and-vehicles",
    "/simple-insights/home-and-property",
    "/simple-insights/finances",
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout: 20000,
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const loc = res.headers.location.startsWith("http")
                    ? res.headers.location
                    : BASE + res.headers.location;
                return fetchPage(loc).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return resolve("");
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
        req.on("error", () => resolve(""));
        req.on("timeout", () => { req.destroy(); resolve(""); });
    });
}

function extractLinks(html, currentPath) {
    const links = new Set();
    const regex = /href="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        let href = match[1];
        // Skip anchors, external, assets
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
        if (href.includes(".pdf") || href.includes(".jpg") || href.includes(".png") || href.includes(".css") || href.includes(".js")) continue;
        // Make relative paths absolute
        if (href.startsWith("/")) {
            // Only keep statefarm.com paths
            if (ALLOWED_PATHS.some(p => href.startsWith(p))) {
                links.add(href.split("?")[0].split("#")[0]);
            }
        }
    }
    return [...links];
}

function stripHtml(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ").replace(/&[a-z]+;/g, " ")
        .replace(/\s+/g, " ").trim();
}

function getCategory(path) {
    if (path.includes("/auto")) return "auto-insurance";
    if (path.includes("/renters")) return "renters-insurance";
    if (path.includes("/life")) return "life-insurance";
    if (path.includes("/health")) return "health-insurance";
    if (path.includes("/home") || path.includes("/property")) return "home-insurance";
    if (path.includes("/motorcycle")) return "motorcycle-insurance";
    if (path.includes("/boat")) return "boat-insurance";
    if (path.includes("/pet")) return "pet-insurance";
    if (path.includes("/business")) return "business-insurance";
    if (path.includes("/disability")) return "disability-insurance";
    if (path.includes("/claims")) return "claims";
    if (path.includes("/discounts")) return "discounts";
    if (path.includes("/financial")) return "financial-services";
    if (path.includes("/simple-insights")) return "education";
    return "general";
}

function chunkText(text, maxLen = 600) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let current = "";
    for (const s of sentences) {
        if ((current + s).length > maxLen && current.length > 150) {
            chunks.push(current.trim());
            current = s;
        } else {
            current += " " + s;
        }
    }
    if (current.trim().length > 100) chunks.push(current.trim());
    return chunks;
}

async function crawl() {
    let pageCount = 0;
    let totalSeeded = 0;

    console.log("🕷️  Starting BFS crawl of State Farm...\n");

    while (queue.length > 0 && pageCount < MAX_PAGES) {
        const path = queue.shift();
        if (visited.has(path)) continue;
        visited.add(path);

        const url = BASE + path;
        process.stdout.write(`[${pageCount + 1}/${MAX_PAGES}] ${path} ... `);

        try {
            const html = await fetchPage(url);
            if (!html || html.length < 500) { console.log("empty"); continue; }

            // Extract and queue new links
            const newLinks = extractLinks(html, path);
            for (const link of newLinks) {
                if (!visited.has(link) && !queue.includes(link)) {
                    queue.push(link);
                }
            }

            // Extract text content
            const text = stripHtml(html);
            if (text.length < 200) { console.log("no content"); continue; }

            // Get meaningful content (skip boilerplate)
            const lines = text.split(/\s{3,}/).filter(l => l.length > 80);
            const content = lines.slice(0, 10).join(" ").slice(0, 4000);
            const chunks = chunkText(content);
            const category = getCategory(path);

            let seeded = 0;
            for (let i = 0; i < Math.min(chunks.length, 4); i++) {
                const chunk = chunks[i];
                if (chunk.length < 80) continue;
                // Skip obvious boilerplate
                if (chunk.includes("JavaScript") || chunk.includes("cookie") || chunk.includes("browser")) continue;

                await index.upsertRecords({
                    records: [{
                        _id: `sf-${path.replace(/\//g, "-").slice(1)}-${i}`,
                        text: chunk,
                        category,
                        source: url,
                    }]
                });
                seeded++;
                totalSeeded++;
            }

            console.log(`✓ ${seeded} chunks (${newLinks.length} new links found)`);
            pageCount++;
            await sleep(DELAY_MS);

        } catch (err) {
            console.log(`✗ ${err.message}`);
        }
    }

    console.log(`\n✅ Crawl complete!`);
    console.log(`   Pages crawled: ${pageCount}`);
    console.log(`   Total chunks seeded: ${totalSeeded}`);
    console.log(`   Queue remaining: ${queue.length} (increase MAX_PAGES to crawl more)`);
}

crawl();
