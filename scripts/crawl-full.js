const https = require("https");
const http = require("http");
const { Pinecone } = require("@pinecone-database/pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index("rag", process.env.PINECONE_INDEX_HOST);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

const BASE_SF = "https://www.statefarm.com";
const BASE_CFPB = "https://www.consumerfinance.gov";
const MAX_PAGES = 500;
const MAX_PDFS = 50;
const DELAY_HTML = 400;
const DELAY_PDF = 2000; // PDFs need more time

const visited = new Set();
const visitedPdfs = new Set();
const queue = [];
const pdfQueue = [];

// State Farm seed URLs
const SF_SEEDS = [
    "/insurance/renters", "/insurance/auto", "/insurance/life",
    "/insurance/health", "/insurance/home-and-property", "/insurance/pet",
    "/insurance/disability", "/insurance/motorcycles", "/insurance/boats",
    "/insurance/motorhomes", "/insurance/travel-trailers", "/insurance/liability",
    "/insurance/identity-restoration", "/insurance/personal-articles-policy",
    "/insurance/bundling", "/insurance/quotes", "/insurance/personal-price-plan",
    "/claims", "/claims/auto", "/claims/home-and-property", "/claims/health-life",
    "/simple-insights/insurance", "/simple-insights/auto-and-vehicles",
    "/simple-insights/residence", "/simple-insights/banking",
    "/simple-insights/family", "/simple-insights/college",
    "/simple-insights/health-insurance", "/simple-insights/finances",
];

// CFPB seed URLs
const CFPB_SEEDS = [
    "/consumer-tools/credit-reports-and-scores/",
    "/consumer-tools/debt-collection/",
    "/consumer-tools/auto-loans/",
    "/consumer-tools/mortgages/",
    "/consumer-tools/student-loans/",
    "/consumer-tools/payday-loans/",
    "/consumer-tools/prepaid-cards/",
    "/consumer-tools/money-as-you-grow/",
    "/consumer-tools/credit-cards/",
    "/consumer-tools/bank-accounts/",
    "/consumer-tools/savings-accounts/",
    "/consumer-tools/retirement/",
    "/consumer-tools/sending-money/",
    "/consumer-tools/budgeting/",
];

// Known State Farm PDF documents
const SF_PDFS = [
    "https://www.statefarm.com/content/dam/sf-library/en-us/pca-endorsement/auto/9835C.pdf",
    "https://www.statefarm.com/content/dam/sf-library/en-us/secure/insurance/renters/renters-insurance-guide.pdf",
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchRaw(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*",
            },
            timeout: 25000,
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const loc = res.headers.location.startsWith("http") ? res.headers.location : BASE_SF + res.headers.location;
                return fetchRaw(loc).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return resolve({ data: Buffer.alloc(0), contentType: "" });
            const chunks = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => resolve({
                data: Buffer.concat(chunks),
                contentType: res.headers["content-type"] || ""
            }));
        });
        req.on("error", () => resolve({ data: Buffer.alloc(0), contentType: "" }));
        req.on("timeout", () => { req.destroy(); resolve({ data: Buffer.alloc(0), contentType: "" }); });
    });
}

function extractLinks(html, base) {
    const links = { pages: [], pdfs: [] };
    const regex = /href="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        let href = match[1];
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

        // Handle PDF links
        if (href.toLowerCase().includes(".pdf")) {
            const pdfUrl = href.startsWith("http") ? href : (href.startsWith("/") ? base + href : null);
            if (pdfUrl && pdfUrl.includes("statefarm.com")) links.pdfs.push(pdfUrl);
            continue;
        }

        // Handle page links
        if (href.startsWith("/")) {
            const allowed = base === BASE_SF
                ? ["/insurance/", "/claims/", "/simple-insights/", "/discounts/"]
                : ["/consumer-tools/", "/ask-cfpb/", "/about-us/"];
            if (allowed.some(p => href.startsWith(p))) {
                links.pages.push(href.split("?")[0].split("#")[0]);
            }
        }
    }
    return links;
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

function getCategory(url) {
    if (url.includes("/auto")) return "auto-insurance";
    if (url.includes("/renters")) return "renters-insurance";
    if (url.includes("/life")) return "life-insurance";
    if (url.includes("/health") || url.includes("/medicare")) return "health-insurance";
    if (url.includes("/home") || url.includes("/homeowners") || url.includes("/condo")) return "home-insurance";
    if (url.includes("/pet")) return "pet-insurance";
    if (url.includes("/disability")) return "disability-insurance";
    if (url.includes("/motorcycle") || url.includes("/boat") || url.includes("/motorhome")) return "vehicle-insurance";
    if (url.includes("/claims")) return "claims";
    if (url.includes("/discount")) return "discounts";
    if (url.includes("/financial")) return "financial-services";
    if (url.includes("/credit")) return "credit";
    if (url.includes("/debt")) return "debt";
    if (url.includes("/student")) return "student-loans";
    if (url.includes("/payday")) return "predatory-lending";
    if (url.includes("/mortgage")) return "mortgage";
    if (url.includes("/simple-insights") || url.includes("/consumer-tools")) return "education";
    return "general";
}

function chunkText(text, maxLen = 650) {
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

async function processPdf(url) {
    if (visitedPdfs.has(url)) return 0;
    visitedPdfs.add(url);

    process.stdout.write(`  📄 PDF: ${url.split("/").pop()} ... `);
    try {
        const { data, contentType } = await fetchRaw(url);
        if (!data || data.length < 1000) { console.log("empty"); return 0; }
        if (!contentType.includes("pdf") && !url.includes(".pdf")) { console.log("not pdf"); return 0; }

        const base64 = data.toString("base64");

        // Use Gemini to extract text from PDF
        const result = await model.generateContent([
            "Extract all meaningful text content from this PDF document. Focus on insurance coverage details, terms, conditions, exclusions, costs, and key information. Return plain text only, no markdown.",
            { inlineData: { data: base64, mimeType: "application/pdf" } }
        ]);

        const text = result.response.text();
        if (!text || text.length < 100) { console.log("no text"); return 0; }

        const chunks = chunkText(text, 700);
        const category = getCategory(url);
        let seeded = 0;

        for (let i = 0; i < Math.min(chunks.length, 8); i++) {
            const chunk = chunks[i];
            if (chunk.length < 80) continue;
            const id = `pdf-${url.split("/").pop().replace(".pdf", "")}-${i}`;
            await index.upsertRecords({ records: [{ _id: id, text: chunk, category, source: url }] });
            seeded++;
        }

        console.log(`✓ ${seeded} chunks from PDF`);
        return seeded;
    } catch (err) {
        console.log(`✗ ${err.message.slice(0, 50)}`);
        return 0;
    }
}

async function processPage(url, base) {
    if (visited.has(url)) return { seeded: 0, newPages: [], newPdfs: [] };
    visited.add(url);

    const fullUrl = url.startsWith("http") ? url : base + url;
    process.stdout.write(`  🌐 ${url.slice(0, 60)} ... `);

    try {
        const { data, contentType } = await fetchRaw(fullUrl);
        const html = data.toString("utf8");

        if (!html || html.length < 500) { console.log("empty"); return { seeded: 0, newPages: [], newPdfs: [] }; }

        const links = extractLinks(html, base);
        const text = stripHtml(html);
        if (text.length < 200) { console.log("no content"); return { seeded: 0, newPages: links.pages, newPdfs: links.pdfs }; }

        const lines = text.split(/\s{3,}/).filter(l => l.length > 80);
        const content = lines.slice(0, 12).join(" ").slice(0, 5000);
        const chunks = chunkText(content);
        const category = getCategory(url);

        let seeded = 0;
        for (let i = 0; i < Math.min(chunks.length, 4); i++) {
            const chunk = chunks[i];
            if (chunk.length < 80) continue;
            if (chunk.includes("JavaScript") || chunk.includes("window.") || chunk.includes("function(")) continue;

            const id = `page-${url.replace(/\//g, "-").replace(/\./g, "_").slice(1, 60)}-${i}`;
            await index.upsertRecords({ records: [{ _id: id, text: chunk, category, source: fullUrl }] });
            seeded++;
        }

        console.log(`✓ ${seeded} chunks | ${links.pages.length} pages | ${links.pdfs.length} PDFs`);
        return { seeded, newPages: links.pages, newPdfs: links.pdfs };
    } catch (err) {
        console.log(`✗ ${err.message.slice(0, 50)}`);
        return { seeded: 0, newPages: [], newPdfs: [] };
    }
}

async function main() {
    console.log("🚀 Full BFS Crawler - State Farm + CFPB + PDFs\n");
    console.log(`Max pages: ${MAX_PAGES} | Max PDFs: ${MAX_PDFS}\n`);

    // Seed queues
    SF_SEEDS.forEach(p => queue.push({ path: p, base: BASE_SF }));
    CFPB_SEEDS.forEach(p => queue.push({ path: p, base: BASE_CFPB }));
    SF_PDFS.forEach(url => pdfQueue.push(url));

    let pageCount = 0;
    let pdfCount = 0;
    let totalSeeded = 0;

    // BFS crawl pages
    console.log("=== CRAWLING HTML PAGES ===\n");
    while (queue.length > 0 && pageCount < MAX_PAGES) {
        const { path, base } = queue.shift();
        if (visited.has(path)) continue;

        process.stdout.write(`[${pageCount + 1}/${MAX_PAGES}] `);
        const result = await processPage(path, base);
        totalSeeded += result.seeded;
        pageCount++;

        // Add new pages to queue
        for (const p of result.newPages) {
            if (!visited.has(p)) queue.push({ path: p, base });
        }
        // Add new PDFs to queue
        for (const pdf of result.newPdfs) {
            if (!visitedPdfs.has(pdf)) pdfQueue.push(pdf);
        }

        await sleep(DELAY_HTML);
    }

    // Process PDFs
    console.log(`\n=== PROCESSING PDFs (${pdfQueue.length} found) ===\n`);
    const uniquePdfs = [...new Set(pdfQueue)];
    for (const pdfUrl of uniquePdfs.slice(0, MAX_PDFS)) {
        const seeded = await processPdf(pdfUrl);
        totalSeeded += seeded;
        pdfCount++;
        await sleep(DELAY_PDF);
    }

    // Final stats
    const stats = await index.describeIndexStats();
    console.log(`\n${"=".repeat(50)}`);
    console.log(`✅ CRAWL COMPLETE`);
    console.log(`   HTML pages crawled: ${pageCount}`);
    console.log(`   PDFs processed: ${pdfCount}`);
    console.log(`   Chunks seeded this run: ${totalSeeded}`);
    console.log(`   Total records in Pinecone: ${stats.totalRecordCount}`);
    console.log(`${"=".repeat(50)}\n`);
}

main().catch(console.error);
