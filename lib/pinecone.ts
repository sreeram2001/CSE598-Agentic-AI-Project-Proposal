import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const INDEX_NAME = "rag";

export async function queryRAG(query: string, topK = 5): Promise<string> {
    try {
        const index = pc.index(INDEX_NAME, process.env.PINECONE_INDEX_HOST);

        // Use Pinecone's built-in inference (llama-text-embed-v2)
        const results = await index.searchRecords({
            query: { inputs: { text: query }, topK },
            fields: ["text", "category"],
        });

        if (!results.result?.hits || results.result.hits.length === 0) {
            return getStaticContext(query);
        }

        const matched = results.result.hits
            .map((h: { fields?: { text?: string } }) => h.fields?.text as string)
            .filter(Boolean)
            .join("\n\n");

        return matched || getStaticContext(query);
    } catch {
        return getStaticContext(query);
    }
}

export async function seedKnowledgeBase() {
    const docs = getKnowledgeBaseDocs();
    const index = pc.index(INDEX_NAME, process.env.PINECONE_INDEX_HOST);

    for (let i = 0; i < docs.length; i++) {
        await (index.upsertRecords as (r: unknown) => Promise<void>)({
            records: [{ _id: `doc-${i}`, text: docs[i].text, category: docs[i].category }]
        });
    }
    return { seeded: docs.length };
}

function getStaticContext(query: string): string {
    const q = query.toLowerCase();
    if (q.includes("renters") || q.includes("renter")) return KNOWLEDGE_BASE.rentersInsurance;
    if (q.includes("auto") || q.includes("car")) return KNOWLEDGE_BASE.autoInsurance;
    if (q.includes("life insurance")) return KNOWLEDGE_BASE.lifeInsurance;
    if (q.includes("emergency") || q.includes("crisis")) return KNOWLEDGE_BASE.emergency;
    if (q.includes("budget") || q.includes("saving")) return KNOWLEDGE_BASE.budgeting;
    if (q.includes("credit") || q.includes("card")) return KNOWLEDGE_BASE.creditCards;
    if (q.includes("deductible") || q.includes("premium")) return KNOWLEDGE_BASE.insuranceBasics;
    return KNOWLEDGE_BASE.general;
}

const KNOWLEDGE_BASE = {
    rentersInsurance: `State Farm Renters Insurance: Covers personal property (laptop, furniture, clothes) against theft, fire, water damage. Average cost $12-18/month. Covers liability if someone is injured in your apartment. Does NOT cover floods or earthquakes. Deductible typically $500-1000. For ASU students: your parents' homeowners policy may cover you if you're a dependent. Get a quote at statefarm.com. Recommended for anyone renting - your landlord's insurance does NOT cover your belongings.`,
    autoInsurance: `State Farm Auto Insurance: Required by law in Arizona. Minimum coverage: $25,000 bodily injury per person, $50,000 per accident, $15,000 property damage. For gig workers (DoorDash, Uber): personal auto insurance may NOT cover accidents while working - you need rideshare coverage. State Farm offers rideshare insurance add-on. Average cost for young drivers: $150-250/month. Good student discount available (3.0 GPA or higher saves up to 25%).`,
    lifeInsurance: `State Farm Term Life Insurance: Pays a lump sum to beneficiaries if you die. Term life (10-30 years) is cheapest - $20-30/month for $250,000 coverage for healthy 20-year-old. Whole life builds cash value but costs 5-10x more. For students: consider if you have dependents or co-signed loans. Parents may lose income if you pass. Get quotes at statefarm.com.`,
    emergency: `Emergency Resources: 211 - free hotline for emergency rental assistance, food banks, utility help. ASU Emergency Aid Fund: asu.edu/emergency-aid - up to $500 for enrolled students. Maricopa County Emergency Rental Assistance: up to 3 months rent. SNAP benefits for food assistance. Arizona Health Care Cost Containment System (AHCCCS) for free/low-cost health insurance. DoorDash/Uber: request early payout if available. Credit card cash advance as last resort (high fees). Never use payday loans - APR can exceed 400%.`,
    budgeting: `50/30/20 Rule: 50% needs (rent, food, transport), 30% wants (entertainment, dining out), 20% savings/debt. For students on $1,400/month: $700 needs, $420 wants, $280 savings. Emergency fund goal: 3-6 months of expenses. Start with $1,000 as first milestone. High-yield savings account (Marcus, Ally) earns 4-5% APY vs 0.01% at big banks. Automate savings - set up automatic transfer on payday.`,
    creditCards: `Best student credit cards 2024: Discover it Student Cash Back - 5% rotating categories, no annual fee, $0 first year matched. Chase Freedom Student - $50 bonus after first purchase, 1% cashback. Capital One Quicksilver Student - 1.5% unlimited cashback. Bank bonuses: Chase Total Checking $300 bonus with direct deposit. Wells Fargo $300 bonus. Avoid: store credit cards (high APR 25-30%), payday loans, buy-now-pay-later for non-essentials. Build credit: keep utilization under 30%, pay full balance monthly.`,
    insuranceBasics: `Insurance Key Terms: Premium - monthly payment to keep insurance active. Deductible - amount YOU pay before insurance kicks in (higher deductible = lower premium). Coverage limit - maximum insurance will pay. Copay - fixed amount you pay per doctor visit. Out-of-pocket maximum - most you'll pay in a year. Liability - covers damage/injury you cause to others. Comprehensive - covers non-collision damage (theft, weather). Collision - covers your car in accidents.`,
    general: `SparkyFi helps ASU students and young adults make smart financial decisions. Key priorities: 1) Build $1,000 emergency fund first. 2) Get renters insurance ($12-18/mo protects everything you own). 3) Understand your credit score (check free at annualcreditreport.com). 4) Avoid high-interest debt. 5) Take advantage of student discounts and bank bonuses. State Farm offers student discounts on auto and renters insurance. CFPB (consumerfinance.gov) has free financial education tools.`,
};

function getKnowledgeBaseDocs() {
    return Object.entries(KNOWLEDGE_BASE).map(([category, text]) => ({ category, text }));
}
