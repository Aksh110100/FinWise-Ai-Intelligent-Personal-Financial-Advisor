import { getFinancialSummary }   from './financial-summary.tool';
import { getExpenseAnalysis }    from './expense-analysis.tool';
import { getSavingsAnalysis }    from './savings-analysis.tool';
import { getGoalAnalysis }       from './goal-analysis.tool';
import { getBudgetAnalysis }     from './budget-analysis.tool';
import { getMutualFundInfo }     from './mutual-fund.tool';
import { getIPOInfo }            from './ipo.tool';
import { calculateSIP, calculateRequiredSIP } from './sip-calculator.tool';
import { ToolResult }            from './tool.types';
import { GeminiProvider } from '../providers/gemini.provider';

export {
  getFinancialSummary,
  getExpenseAnalysis,
  getSavingsAnalysis,
  getGoalAnalysis,
  getBudgetAnalysis,
  getMutualFundInfo,
  calculateSIP,
  calculateRequiredSIP,
  ToolResult,
};

export type ToolIntent =
  | 'GENERAL_FINANCE'
  | 'FINANCIAL_SUMMARY'
  | 'EXPENSE_ANALYSIS'
  | 'SAVINGS_ANALYSIS'
  | 'GOAL_ANALYSIS'
  | 'BUDGET_ANALYSIS'
  | 'SIP_CALCULATOR'
  | 'MUTUAL_FUND'
  | 'IPO';

export interface IntentObject {
  intent: ToolIntent;
  confidence: number;
  entities: {
    period?: string | null;
    category?: string | null;
    goalName?: string | null;
    monthlyInvestment?: number | null;
    annualReturnRate?: number | null;
    durationMonths?: number | null;
    targetAmount?: number | null;
    fundName?: string | null;
    ipoName?: string | null;
    queryType?: 'search' | 'nav' | 'history' | 'categories' | 'details' | 'open' | 'upcoming' | 'all' | null;
  };
  secondaryIntents?: ToolIntent[];
}

const EXPENSE_KEYWORDS  = ['spend', 'spent', 'spending', 'expense', 'expenses', 'outgoing', 'outgoings', 'money going', 'money spent', 'where am i spending', 'biggest spending', 'highest spending', 'spending categories', 'paid', 'bought', 'purchase', 'cost me', 'charged', 'transaction', 'food budget'];
const SAVINGS_KEYWORDS  = ['save', 'saving', 'savings', 'putting aside', 'set aside', 'saved', 'money saved', 'savings rate', 'how much i save', 'how much am i saving'];
const GOAL_KEYWORDS     = ['goal', 'target', 'progress', 'on track', 'how far', 'remaining', 'need for my', 'car goal', 'travel goal', 'education goal', 'saving for'];
const BUDGET_KEYWORDS   = ['budget', 'budgeted', ' limit ', 'spending limit', 'over budget', 'under budget', 'budget remaining', 'budget left', 'within budget', 'budget status'];
const SIP_KEYWORDS      = ['sip', 'systematic investment', 'monthly investment', 'monthly investing', 'invest every month', 'invest per month', 'invest monthly', 'if i invest', 'invest ₹', 'invest rs'];
const SUMMARY_KEYWORDS  = ['financial position', 'financial health', 'financial overview', 'financial summary', 'how am i doing financially', 'overall finances', 'cash flow', 'net worth', 'afford', 'can i invest', 'financial data', 'financial records', 'my data', 'my records'];
const IPO_KEYWORDS = ['ipo', 'initial public offering', 'open ipos', 'upcoming ipos'];

export function extractGoalName(message: string): string | undefined {
  const lower = message.toLowerCase();
  const patterns = [
    /(?:my|for my|about my)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+goal/i,
    /goal\s+(?:for|named?|called?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /saving\s+for\s+(?:a|my)?\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
  ];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

export function extractCategoryName(message: string): string | undefined {
  const lower = message.toLowerCase();
  if (lower.includes('where am i spending the most') || 
      lower.includes('biggest expenses') || 
      lower.includes('highest spending') ||
      lower.includes('lowest expense') ||
      lower.includes('smallest expense') ||
      lower.includes('lowest spending') ||
      lower.includes('least on')) {
    return undefined;
  }
  const patterns = [
    /(?:spend|spent|spending|budget)\s+on\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(?:expenses?|spending|budget)/i,
  ];
  const stopwords = ['am i', 'where am i', 'how much', 'my', 'the', 'total', 'biggest', 'highest', 'most', 'all', 'what', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  for (const p of patterns) {
    const m = lower.match(p);
    if (m?.[1] && m[1].length > 2) {
      let cat = m[1].trim();
      // Remove stopwords if they are part of the match (e.g. "me september" might have "me" but "me" is not in stopwords. Wait, just filter if any stopword matches fully).
      const words = cat.split(/\s+/);
      cat = words.filter(w => !stopwords.includes(w)).join(' ');
      if (cat.length > 2) return cat;
    }
  }
  return undefined;
}

export function extractSIPParams(message: string): { monthlyInvestment?: number; annualReturnRate?: number; durationMonths?: number; targetAmount?: number } {
  const result: { monthlyInvestment?: number; annualReturnRate?: number; durationMonths?: number; targetAmount?: number } = {};
  const amtMatch = message.match(/(?:₹|rs\.?\s*|inr\s*)([0-9,]+)/i)
    || message.match(/([0-9,]+)\s*(?:monthly|\/month|per month)/i);
  if (amtMatch) result.monthlyInvestment = parseInt(amtMatch[1].replace(/,/g, ''));
  const rateMatch = message.match(/(?:at\s+)?([0-9]+(?:\.[0-9]+)?)\s*%/);
  if (rateMatch) result.annualReturnRate = parseFloat(rateMatch[1]);
  const yearMatch  = message.match(/([0-9]+)\s*years?/i);
  const monthMatch = message.match(/([0-9]+)\s*months?/i);
  if (yearMatch)  result.durationMonths = parseInt(yearMatch[1]) * 12;
  else if (monthMatch) result.durationMonths = parseInt(monthMatch[1]);
  return result;
}

export function extractExpensePeriod(message: string): string {
  const lower = message.toLowerCase();
  
  const monthMatch = lower.match(/(january|february|march|april|may|june|july|august|september|october|november|december)/);
  if (monthMatch) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIndex = months.indexOf(monthMatch[1]) + 1;
    
    const yearMatch = lower.match(/20[0-9]{2}/);
    let year = new Date().getFullYear();
    if (yearMatch) {
      year = parseInt(yearMatch[0], 10);
    }
    return `specific_month_${year}_${monthIndex}`;
  }
  
  if (lower.includes('last month') || lower.includes('previous month')) return 'previous_month';
  if (lower.includes('last 30') || lower.includes('past 30'))           return 'last_30_days';
  if (lower.includes('last 90') || lower.includes('past 90') || lower.includes('3 months') || lower.includes('three months')) return 'last_90_days';
  return 'current_month';
}

const systemPromptForClassifier = `You are an intent classifier for a personal finance AI.
Analyze the user message and extract the intent and entities.
Return ONLY valid JSON matching this schema:
{
  "intent": "GENERAL_FINANCE" | "FINANCIAL_SUMMARY" | "EXPENSE_ANALYSIS" | "SAVINGS_ANALYSIS" | "GOAL_ANALYSIS" | "BUDGET_ANALYSIS" | "SIP_CALCULATOR" | "MUTUAL_FUND" | "IPO",
  "confidence": number between 0.0 and 1.0,
  "entities": {
    "period": "string | null",
    "category": string | null,
    "goalName": string | null,
    "monthlyInvestment": number | null,
    "annualReturnRate": number | null,
    "durationMonths": number | null,
    "targetAmount": number | null,
    "fundName": string | null,
    "ipoName": string | null,
    
    "queryType": "search" | "nav" | "history" | "categories" | "details" | null
  },
  "secondaryIntents": []
}
Rules:
1. Do not answer the user, just output JSON.
2. If uncertain, return GENERAL_FINANCE with low confidence.
3. Use EXPENSE_ANALYSIS for "Where is my money going?" or "How much did I spend this month?".
4. Do NOT extract words like "lowest", "highest", "biggest", "smallest", "least", "most" as categories. If the user asks for "lowest expense", set category to null.
5. Use MUTUAL_FUND for any questions about external mutual funds (e.g. NAV, history, searching funds, categories like Large Cap). Extract the fund name and set queryType to nav, history, details, search, or categories appropriately.
6. Use IPO for questions about Initial Public Offerings (e.g., "What IPOs are open?", "Tell me about ABC IPO"). Set ipoName if a specific one is mentioned.
7. Use FINANCIAL_SUMMARY for questions like "Do you have my financial data", "What is my financial status", or asking for a general overview of all accounts/finances/records.
`;

export async function detectIntent(message: string): Promise<IntentObject> {
  const t0 = Date.now();
  const normalized = message.toLowerCase().replace(/[^\w\s₹]/g, ' ').replace(/\s+/g, ' ').trim();
  
  const hasExpense  = EXPENSE_KEYWORDS.some(k  => normalized.includes(k));
  const hasSavings  = SAVINGS_KEYWORDS.some(k  => normalized.includes(k));
  const hasGoal     = GOAL_KEYWORDS.some(k     => normalized.includes(k));
  const hasBudget   = BUDGET_KEYWORDS.some(k   => normalized.includes(k));
  const hasSIP      = SIP_KEYWORDS.some(k      => normalized.includes(k));
  const hasSummary  = SUMMARY_KEYWORDS.some(k  => normalized.includes(k));
  const hasIPO      = IPO_KEYWORDS.some((k: string) => normalized.includes(k));

  const matchCount = [hasExpense, hasSavings, hasGoal, hasBudget, hasSIP, hasSummary, hasIPO].filter(Boolean).length;

  const getLocalEntities = () => {
    let ipoName: string | null = null;
    let queryType: any = null;
    if (hasIPO) {
      if (normalized.includes('upcoming') && (normalized.includes('open') || normalized.includes('current'))) {
         queryType = 'all';
      } else if (normalized.includes('upcoming')) {
         queryType = 'upcoming';
      } else if (normalized.includes('open') || normalized.includes('current')) {
         queryType = 'open';
      }
      const match = normalized.match(/about\s+(.+?)\s+ipo/);
      if (match) ipoName = match[1];
    }
    const sipParams = extractSIPParams(message);
    return {
      period: extractExpensePeriod(message),
      category: extractCategoryName(message) || null,
      goalName: extractGoalName(message) || null,
      monthlyInvestment: sipParams.monthlyInvestment || null,
      annualReturnRate: sipParams.annualReturnRate || null,
      durationMonths: sipParams.durationMonths || null,
      targetAmount: sipParams.targetAmount || null,
      ipoName,
      queryType
    };
  };

  const createFallback = (intent: ToolIntent): IntentObject => ({
    intent,
    confidence: 1.0,
    entities: getLocalEntities()
  });

  if (matchCount === 1) {
    console.log(`[AI ROUTER] Fast Local Routing successful. (Time: ${Date.now() - t0}ms)`);
    if (hasIPO)     return createFallback('IPO');
    if (hasBudget)  return createFallback('BUDGET_ANALYSIS');
    if (hasGoal)    return createFallback('GOAL_ANALYSIS');
    if (hasExpense) return createFallback('EXPENSE_ANALYSIS');
    if (hasSavings) return createFallback('SAVINGS_ANALYSIS');
    if (hasSIP)     return createFallback('SIP_CALCULATOR');
    if (hasSummary) return createFallback('FINANCIAL_SUMMARY');
  }

  // If Ambiguous, try Gemini
  try {
    const geminiT0 = Date.now();
    console.log(`[AI ROUTER] Ambiguous query. Falling back to Gemini Classifier...`);
    const gemini = new GeminiProvider();
    const result = await gemini.generateContent(message, [{ role: "user", parts: [{ text: systemPromptForClassifier }] }]);
    let jsonStr = result;
    const match = result.match(/\{.*\}/s);
    if (match) {
        jsonStr = match[0];
    }
    const parsed = JSON.parse(jsonStr) as IntentObject;
    console.log(`[AI ROUTER] Gemini Classification complete. (Time: ${Date.now() - geminiT0}ms)`);
    if (parsed.intent && parsed.confidence >= 0.75) {
      return parsed;
    }
    return createFallback('GENERAL_FINANCE');
  } catch (err) {
    console.error("[AI] Gemini intent classification failed, using deterministic routing.", err);
    return createFallback('GENERAL_FINANCE');
  }
}

export async function executeTools(
  userId: string,
  message: string,
  intentObj: IntentObject
): Promise<Record<string, ToolResult>> {
  const t0 = Date.now();
  const results: Record<string, ToolResult> = {};
  
  const intentsToExecute = [intentObj.intent];
  if (intentObj.secondaryIntents && Array.isArray(intentObj.secondaryIntents)) {
      intentsToExecute.push(...intentObj.secondaryIntents);
  }

  // Deduplicate
  const uniqueIntents = Array.from(new Set(intentsToExecute));

  // Separate SIP_CALCULATOR because it might depend on GOAL_ANALYSIS
  const independentIntents = uniqueIntents.filter(i => i !== 'SIP_CALCULATOR' && i !== 'GENERAL_FINANCE');
  const hasSip = uniqueIntents.includes('SIP_CALCULATOR');

  const promises = independentIntents.map(async (intent) => {
    switch (intent) {
      case 'IPO':
        results.ipo = await getIPOInfo({
           queryType: (intentObj.entities.queryType as any) || undefined,
           ipoName: intentObj.entities.ipoName || undefined
        });
        break;
      case 'FINANCIAL_SUMMARY':
        results.financial_summary = await getFinancialSummary(userId);
        break;
      case 'EXPENSE_ANALYSIS':
        results.expense_analysis = await getExpenseAnalysis(userId, { 
          period: intentObj.entities.period || 'current_month', 
          categoryName: intentObj.entities.category || undefined 
        });
        break;
      case 'SAVINGS_ANALYSIS':
        results.savings_analysis = await getSavingsAnalysis(userId);
        break;
      case 'GOAL_ANALYSIS':
        results.goal_analysis = await getGoalAnalysis(userId, { 
          goalName: intentObj.entities.goalName || undefined 
        });
        break;
      case 'BUDGET_ANALYSIS': {
        let month: number | undefined;
        let year: number | undefined;
        if (intentObj.entities.period?.startsWith('specific_month_')) {
          const parts = intentObj.entities.period.split('_');
          year = parseInt(parts[2], 10);
          month = parseInt(parts[3], 10);
        }
        results.budget_analysis = await getBudgetAnalysis(userId, { 
          categoryName: intentObj.entities.category || undefined,
          month,
          year
        });
        break;
      }
      case 'MUTUAL_FUND':
        results.mutual_fund = await getMutualFundInfo({
          fundName: intentObj.entities.fundName || undefined,
          category: intentObj.entities.category || undefined,
          queryType: (intentObj.entities.queryType as any) || undefined
        });
        break;
    }
  });

  // Execute independent tools in parallel
  await Promise.all(promises);

  // Execute SIP Calculator after independent tools (in case it needs Goal Data)
  if (hasSip) {
    if (intentObj.entities.monthlyInvestment && intentObj.entities.durationMonths) {
      results.sip_calculator = calculateSIP({
        monthlyInvestment: intentObj.entities.monthlyInvestment,
        annualReturnRate: intentObj.entities.annualReturnRate ?? 12,
        durationMonths: intentObj.entities.durationMonths,
      });
    } else if (intentObj.entities.targetAmount && intentObj.entities.durationMonths) {
      results.sip_calculator = calculateRequiredSIP({
        targetAmount: intentObj.entities.targetAmount,
        annualReturnRate: intentObj.entities.annualReturnRate ?? 12,
        durationMonths: intentObj.entities.durationMonths,
      });
    } else if (results.goal_analysis && results.goal_analysis.status === 'SUCCESS') {
        const goalData = results.goal_analysis.data?.goals?.[0];
        if (goalData?.remainingAmount && goalData?.monthsRemaining) {
          results.sip_calculator = calculateRequiredSIP({
            targetAmount: goalData.remainingAmount,
            annualReturnRate: intentObj.entities.annualReturnRate ?? 12,
            durationMonths: goalData.monthsRemaining,
          });
        }
    }
    else {
      results.sip_calculator = {
        tool: 'sip_calculator',
        status: 'ERROR',
        error: 'Could not extract all required parameters (monthly amount, duration).',
        dataAsOf: new Date().toISOString(),
      };
    }
  }

  console.log(`[AI TOOL EXECUTION] Total tool execution time: ${Date.now() - t0}ms for tools: ${uniqueIntents.join(', ')}`);

  return results;
}
