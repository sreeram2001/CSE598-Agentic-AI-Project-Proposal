const https = require("https");
const http = require("http");
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index("rag", process.env.PINECONE_INDEX_HOST);

// Fetch a URL and return plain text
function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout: 15000,
        }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchPage(res.headers.location).then(resolve).catch(reject);
            }
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    });
}

// Strip HTML and clean text
function stripHtml(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#\d+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Extract meaningful content chunks (500-800 chars each)
function chunkText(text, maxLen = 700) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = "";
    for (const s of sentences) {
        if ((current + s).length > maxLen && current.length > 200) {
            chunks.push(current.trim());
            current = s;
        } else {
            current += " " + s;
        }
    }
    if (current.trim().length > 100) chunks.push(current.trim());
    return chunks;
}

// Pages to scrape
const PAGES = [
    // CFPB educational pages
    { url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/", category: "credit", id: "cfpb-credit-reports" },
    { url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/", category: "debt", id: "cfpb-debt-collection" },
    { url: "https://www.consumerfinance.gov/consumer-tools/prepaid-cards/", category: "banking", id: "cfpb-prepaid" },
    { url: "https://www.consumerfinance.gov/consumer-tools/auto-loans/", category: "loans", id: "cfpb-auto-loans" },
    { url: "https://www.consumerfinance.gov/consumer-tools/mortgages/", category: "housing", id: "cfpb-mortgages" },
    { url: "https://www.consumerfinance.gov/consumer-tools/student-loans/", category: "education", id: "cfpb-student-loans" },
    { url: "https://www.consumerfinance.gov/consumer-tools/payday-loans/", category: "predatory", id: "cfpb-payday-loans" },
    { url: "https://www.consumerfinance.gov/consumer-tools/money-as-you-grow/", category: "financial-wellness", id: "cfpb-money-grow" },
    // State Farm pages
    { url: "https://www.statefarm.com/insurance/renters", category: "insurance", id: "sf-renters" },
    { url: "https://www.statefarm.com/insurance/auto", category: "insurance", id: "sf-auto" },
    { url: "https://www.statefarm.com/insurance/life", category: "insurance", id: "sf-life" },
    { url: "https://www.statefarm.com/insurance/health", category: "insurance", id: "sf-health" },
    { url: "https://www.statefarm.com/financial-services/banking", category: "banking", id: "sf-banking" },
    { url: "https://www.statefarm.com/insurance/home-and-property", category: "insurance", id: "sf-home" },
];

async function scrapeAndSeed() {
    console.log(`\nScraping ${PAGES.length} pages...\n`);
    let totalSeeded = 0;

    for (const page of PAGES) {
        try {
            console.log(`Fetching: ${page.url}`);
            const html = await fetchPage(page.url);
            const text = stripHtml(html);

            if (text.length < 200) {
                console.log(`  ⚠ Too short, skipping`);
                continue;
            }

            // Find the main content (skip nav/footer noise)
            // Look for the densest paragraph of text
            const meaningful = text
                .split(/\n+/)
                .filter(line => line.length > 80)
                .join(" ")
                .slice(0, 5000); // Take first 5000 chars of meaningful content

            const chunks = chunkText(meaningful);
            console.log(`  Found ${chunks.length} chunks`);

            for (let i = 0; i < Math.min(chunks.length, 5); i++) {
                const chunk = chunks[i];
                if (chunk.length < 100) continue;

                const record = {
                    _id: `${page.id}-${i}`,
                    text: chunk,
                    category: page.category,
                    source: page.url,
                };

                await index.upsertRecords({ records: [record] });
                console.log(`  ✓ Seeded chunk ${i + 1}: ${chunk.slice(0, 60)}...`);
                totalSeeded++;

                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 300));
            }
        } catch (err) {
            console.log(`  ✗ Failed: ${err.message}`);
        }
    }

    console.log(`\n✅ Done! Seeded ${totalSeeded} chunks into Pinecone RAG`);
}

scrapeAndSeed();
