export interface Transaction {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    type: "credit" | "debit";
    anomaly?: boolean;
    anomalyReason?: string;
}

export interface FinancialProfile {
    monthlyIncome: number;
    monthlyExpenses: number;
    balance: number;
    savingsRate: number;
    riskScore: number;
    riskReason: string;
    emergencyFund: number;
    spendingByCategory: { name: string; value: number; color: string }[];
    emergencyAlerts: EmergencyAlert[];
    recommendations: Recommendation[];
    savingsOpportunities: SavingsOpportunity[];
    documentRedFlags?: DocumentFlag[];
    documentActions?: DocumentAction[];
}

export interface EmergencyAlert {
    id: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    action: string;
}

export interface Recommendation {
    id: string;
    product: string;
    reason: string;
    monthlyCost: string;
    priority: "high" | "medium" | "low";
    provider: string;
}

export interface SavingsOpportunity {
    id: string;
    title: string;
    monthlySavings: number;
    description: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export interface DocumentAnalysis {
    type: string;
    summary: string;
    redFlags: string[];
    keyTerms: { term: string; explanation: string }[];
    recommendations: string[];
}

export interface DocumentFlag {
    id: string;
    text: string;
    source: string; // document name
}

export interface DocumentAction {
    id: string;
    text: string;
    source: string;
}
