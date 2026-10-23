import { PrismaClient, AIMessageRole } from '@prisma/client';
import { GeminiProvider }   from './providers/gemini.provider';
import { ChatRequestDto, ChatResponseDto } from './ai-advisor.types';
import { detectIntent, executeTools, ToolIntent } from './tools/index';

const prisma = new PrismaClient();

export class AIAdvisorService {
  private geminiProvider: GeminiProvider;

  constructor() {
    this.geminiProvider = new GeminiProvider();
  }

  async processChat(userId: string, request: ChatRequestDto): Promise<ChatResponseDto> {
    const requestStart = Date.now();
    console.log('[AI] Chat request received');

    const { message, conversationId } = request;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Message is required and must not be empty');
    }

    if (message.length > 2000) {
      throw new Error('Message is too long. Maximum allowed length is 2000 characters.');
    }

    // ── 1. Conversation lookup / creation ────────────────────────────────────
    let conversation;
    const convStart = Date.now();

    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conversation) throw new Error('Conversation not found');
    } else {
      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        },
      });
    }
    console.log(`[AI] Conversation ready: ${Date.now() - convStart}ms`);

    // ── 2. Save user message ─────────────────────────────────────────────────
    const userMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role:           AIMessageRole.USER,
        content:        message,
      },
    });

    // ── 3. Fetch prior conversation history ──────────────────────────────────
    const histStart = Date.now();
    const previousMessages = await prisma.aIMessage.findMany({
      where:   { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`[AI CHAT] Request received for user ${userId}, conversationId: ${conversationId || 'new'}`);
    console.log(`[AI] History fetched (${previousMessages.length} messages): ${Date.now() - histStart}ms`);

    const history = previousMessages
      .slice(-10)
      .filter(m => m.id !== userMessage.id)
      .map(m => ({
        role:  m.role === AIMessageRole.USER ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    // ── Performance tracking ──
    let tRouter = 0, tTool = 0, tFinalGemini = 0;

    // ── 4. Tool routing — detect intent and run tools ────────────────────────
    const routerStart = Date.now();
    const intentObj = await detectIntent(message);
    const intent = intentObj.intent;
    tRouter = Date.now() - routerStart;
    console.log(`[ROUTER] Intent selected: ${intent}`);
    console.log(`[ROUTER] Extracted entities: ${JSON.stringify(intentObj.entities)}`);

    let messageToGemini = message;
    let enableSearch = false;

    if (intent !== 'GENERAL_FINANCE') {
      const toolStart = Date.now();
      const toolResults = await executeTools(userId, message, intentObj);
      tTool = Date.now() - toolStart;
      console.log(`[TOOL RESULT] Tools executed: ${Object.keys(toolResults).join(', ')}`);
      Object.entries(toolResults).forEach(([name, res]) => {
         console.log(`[TOOL RESULT] ${name} status: ${res?.status}`);
      });

      // Build the financial data context block to append to the user's message
      const dataBlock = buildDataContext(toolResults);
      messageToGemini = `${message}\n\n${dataBlock}`;

      // Determine if Google Search grounding should be enabled
      if (intent === 'IPO') {
        const qType = intentObj.entities.queryType;
        if (qType === 'upcoming' || qType === 'all') {
          enableSearch = true;
        } else {
          const ipoResult = toolResults['ipo'];
          if (ipoResult && (ipoResult.status === 'NO_DATA' || ipoResult.status === 'ERROR')) {
            enableSearch = true;
          }
        }
      }
    }

    // ── 5. Generate AI response ──────────────────────────────────────────────
    const geminiStart = Date.now();
    let aiResponseText: string;
    try {
      console.log(`[GEMINI] Sending context and history to Gemini... (enableSearch: ${enableSearch})`);
      aiResponseText = await this.geminiProvider.generateContent(messageToGemini, history, enableSearch);
      tFinalGemini = Date.now() - geminiStart;
      console.log(`[GEMINI] Response generated in ${tFinalGemini}ms`);
    } catch (error: any) {
      if (enableSearch && (error.message.includes('GEMINI_QUOTA_EXCEEDED') || error.message.includes('GEMINI_BAD_REQUEST') || error.message.includes('GEMINI_AUTH_ERROR') || error.message.includes('429'))) {
        console.warn(`[GEMINI] Google Search Grounding failed (${error.message}). Retrying without search...`);
        // Append a note to the message that upcoming IPO information couldn't be retrieved via search
        messageToGemini += `\n\n[SYSTEM INSTRUCTION]: Google Search Grounding is currently unavailable due to an API error. You must state that current upcoming IPO information could not be verified right now. If IPOAlerts data was provided for open IPOs, you can still discuss those.`;
        
        const fallbackStart = Date.now();
        aiResponseText = await this.geminiProvider.generateContent(messageToGemini, history, false);
        tFinalGemini = Date.now() - fallbackStart;
        console.log(`[GEMINI] Fallback response generated in ${tFinalGemini}ms`);
      } else {
        console.error(`[GEMINI] Call failed after ${Date.now() - requestStart}ms`);
        console.error(`[DEBUG_ERROR] Name:`, error.name);
        console.error(`[DEBUG_ERROR] Message:`, error.message);
        console.error(`[DEBUG_ERROR] HTTP Status:`, error.status || error.statusCode || 'unknown');
        if (error.response) {
          console.error(`[DEBUG_ERROR] Response status:`, error.response.status);
          // console.error(`[DEBUG_ERROR] Response data:`, error.response.data); // omit for safety if it contains sensitive data, but user said "if safe"
        }
        console.error(`[DEBUG_ERROR] Gemini Model:`, process.env.GEMINI_MODEL);
        console.error(`[DEBUG_ERROR] IPO Intent:`, intent);
        console.error(`[DEBUG_ERROR] Stack trace:\n`, error.stack);
        
        throw error;
      }
    }

    // ── 6. Save assistant response ───────────────────────────────────────────
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role:           AIMessageRole.ASSISTANT,
        content:        aiResponseText,
      },
    });

    const totalTime = Date.now() - requestStart;
    console.log(`[AI_REQUEST] ROUTER=${tRouter}ms TOOL=${tTool}ms FINAL_GEMINI=${tFinalGemini}ms total=${totalTime}ms`);

    return {
      success: true,
      data: { conversation, userMessage, assistantMessage },
    };
  }

  async getConversations(userId: string) {
    return await prisma.aIConversation.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where:   { id: conversationId, userId },
      include: { Messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) throw new Error('Conversation not found');
    return conversation;
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) throw new Error('Conversation not found');

    await prisma.aIConversation.delete({ where: { id: conversationId } });
    return { success: true, message: 'Conversation deleted successfully' };
  }

  async renameConversation(userId: string, conversationId: string, title: string) {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      throw new Error('Title must be a non-empty string');
    }
    const cleanTitle = title.trim().substring(0, 80); // enforce max length

    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) throw new Error('Conversation not found');

    return await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { title: cleanTitle },
    });
  }
}

/**
 * Builds a structured VERIFIED_FINANCIAL_DATA block that is appended to the
 * user's message before sending to Gemini. This is the "tool result injection"
 * pattern — the LLM receives verified numbers as context.
 *
 * The block is clearly labelled so the LLM knows it must use these figures.
 */
function buildDataContext(toolResults: Record<string, any>): string {
  const lines: string[] = ['VERIFIED_FINANCIAL_DATA (use these numbers only — do not invent any figures):'];

  for (const [toolName, result] of Object.entries(toolResults)) {
    if (!result) continue;

    if (result.status === 'ERROR') {
      lines.push(`\n[${toolName}] DATA ERROR: ${result.error}. IMPORTANT: Tell the user a technical error occurred. DO NOT say they have zero expenses, zero savings, or no records.`);
      continue;
    }
    
    if (result.status === 'NO_DATA') {
      if (toolName === 'mutual_fund') {
         lines.push(`\n[${toolName}] FUND NOT FOUND: No mutual fund matching the user's query exists in the database. Tell the user you cannot find this specific fund.`);
      } else {
         lines.push(`\n[${toolName}] DATA UNAVAILABLE: No records found for this query.`);
      }
      continue;
    }

    const data = result.data;
    const ts   = result.dataAsOf;

    switch (toolName) {
      case 'financial_summary':
        lines.push(`\n[Financial Summary — as of ${ts}]`);
        lines.push(`Month/Year: ${data.currentMonth}/${data.currentYear}`);
        lines.push(`Monthly Income: ${data.monthlyIncome !== null ? `₹${data.monthlyIncome}` : 'No income records this month'}`);
        lines.push(`Monthly Expenses: ${data.monthlyExpenses !== null ? `₹${data.monthlyExpenses}` : 'No expense records this month'}`);
        lines.push(`Monthly Surplus: ${data.monthlySurplus !== null ? `₹${data.monthlySurplus}` : 'Cannot calculate (missing income or expense data)'}`);
        lines.push(`Savings Rate: ${data.savingsRate !== null ? `${data.savingsRate}%` : 'Cannot calculate'}`);
        lines.push(`Total Savings (all-time): ${data.totalSavings !== null ? `₹${data.totalSavings}` : 'No savings records'}`);
        lines.push(`This Month Savings: ${data.thisMonthSavings !== null ? `₹${data.thisMonthSavings}` : 'No savings records this month'}`);
        lines.push(`Total Investments (invested amount): ${data.totalInvestments !== null ? `₹${data.totalInvestments}` : 'No investment records'}`);
        lines.push(`Total Account Balance: ${data.accountBalance !== null ? `₹${data.accountBalance}` : 'No account records'}`);
        lines.push(`Active Goals: ${data.activeGoalCount}`);
        break;

      case 'expense_analysis':
        lines.push(`\n[Expense Analysis — ${data.period}]`);
        lines.push(`Total Spending: ₹${data.totalSpending}`);
        lines.push(`Transaction Count: ${data.transactionCount}`);
        lines.push(`Daily Average: ₹${data.dailyAverage}`);
        if (data.highestExpense) {
          lines.push(`Highest Expense: ₹${data.highestExpense.amount} at ${data.highestExpense.merchant} on ${new Date(data.highestExpense.date).toLocaleDateString()}`);
        }
        if (data.lowestExpense) {
          lines.push(`Lowest Expense: ₹${data.lowestExpense.amount} at ${data.lowestExpense.merchant} on ${new Date(data.lowestExpense.date).toLocaleDateString()}`);
        }
        if (data.topCategory) {
          lines.push(`Top Category: ${data.topCategory.name} (₹${data.topCategory.amount}, ${data.topCategory.percentage}%)`);
        }
        if (data.categoryBreakdown?.length) {
          lines.push('Category Breakdown:');
          data.categoryBreakdown.slice(0, 8).forEach((c: any) => {
            lines.push(`  - ${c.name}: ₹${c.amount} (${c.percentage}%, ${c.transactionCount} txns)`);
          });
        }
        if (data.totalSpending === 0) {
          lines.push('No expense records found for this period.');
        }
        break;

      case 'savings_analysis':
        lines.push(`\n[Savings Analysis — ${data.currentMonth}/${data.currentYear}]`);
        lines.push(`Total Savings (all-time): ₹${data.totalSavings}`);
        lines.push(`This Month Savings: ₹${data.thisMonthSavings}`);
        lines.push(`Previous Month Savings: ₹${data.previousMonthSavings}`);
        lines.push(`Monthly Change: ${data.monthlyChangePct !== null ? `${data.monthlyChangePct}%` : 'Cannot calculate (no previous month data)'}`);
        lines.push(`6-Month Average Monthly Savings: ₹${data.avgMonthlySavings}`);
        lines.push(`Savings Rate (vs this month income): ${data.savingsRate !== null ? `${data.savingsRate}%` : 'Cannot calculate (no income record this month)'}`);
        lines.push(`Total Saving Records: ${data.totalTransactions}`);
        break;

      case 'goal_analysis':
        lines.push(`\n[Goal Analysis]`);
        lines.push(`Total Active Goals: ${data.activeCount}`);
        lines.push(`Total Completed Goals: ${data.completedCount}`);
        if (data.goals?.length) {
          data.goals.forEach((g: any) => {
            lines.push(`\nGoal: "${g.name}" (${g.status})`);
            lines.push(`  Target: ₹${g.targetAmount}`);
            lines.push(`  Saved (linked savings): ₹${g.savedAmount}`);
            lines.push(`  Remaining: ₹${g.remainingAmount}`);
            lines.push(`  Progress: ${g.progressPct}%`);
            lines.push(`  Target Date: ${g.targetDate ?? 'Not set'}`);
            lines.push(`  Months Remaining: ${g.monthsRemaining ?? 'Cannot calculate (no target date)'}`);
            lines.push(`  Required Monthly Saving: ${g.requiredMonthlySaving !== null ? `₹${g.requiredMonthlySaving}` : 'Cannot calculate'}`);
          });
        } else {
          lines.push('No goals found matching the query.');
        }
        break;

      case 'budget_analysis':
        lines.push(`\n[Budget Analysis — ${data.periodLabel}]`);
        lines.push(`Total Budget: ₹${data.totalBudget}`);
        lines.push(`Total Spent: ₹${data.totalSpent}`);
        lines.push(`Total Remaining: ₹${data.totalRemaining}`);
        lines.push(`Overall Utilization: ${data.overallUtilization}%`);
        lines.push(`Active Budgets: ${data.activeBudgetCount}`);
        lines.push(`Over-Budget Count: ${data.overBudgetCount}`);
        lines.push(`Near-Limit Count: ${data.nearLimitCount}`);
        if (data.budgets?.length) {
          lines.push('Budget Details:');
          data.budgets.forEach((b: any) => {
            lines.push(`  - ${b.name}: Budget ₹${b.budgetAmount} | Spent ₹${b.spent} | Remaining ₹${b.remaining} | ${b.percentageUsed}% used | ${b.status}`);
          });
        } else {
          lines.push('No budgets found for this period.');
        }
        break;

      case 'sip_calculator':
        lines.push(`\n[SIP Calculation]`);
        lines.push(`Monthly Investment: ₹${data.monthlyInvestment}`);
        lines.push(`Duration: ${data.durationYears} years (${data.durationMonths} months)`);
        lines.push(`Assumed Annual Return: ${data.annualReturnRate}% (ASSUMPTION — not guaranteed)`);
        lines.push(`Total Invested: ₹${data.totalInvested}`);
        lines.push(`Projected Future Value: ₹${data.futureValue}`);
        lines.push(`Estimated Returns: ₹${data.estimatedReturns}`);
        lines.push(`Wealth Gain vs Invested: ${data.wealthGainPct}%`);
        if (data.requiredMonthlySIP !== undefined) {
          lines.push(`Required Monthly SIP: ₹${data.requiredMonthlySIP}`);
        }
        lines.push(`DISCLAIMER: ${data.disclaimer}`);
        break;

      case 'mutual_fund':
        if (data.funds) {
          lines.push(`\n[Mutual Fund Search Results - ${data.count} found]`);
          data.funds.forEach((f: any) => lines.push(` - ${f.name} (${f.category})`));
        } else if (data.fund) {
          lines.push(`\n[Mutual Fund Details: ${data.fund.name}]`);
          lines.push(`Category: ${data.fund.category}`);
          lines.push(`Latest NAV: ₹${data.fund.nav} (as of ${data.fund.navDate})`);
          lines.push(`1Y Return: ${data.fund.return1y ? data.fund.return1y + '%' : 'N/A'}`);
          lines.push(`3Y Return: ${data.fund.return3y ? data.fund.return3y + '%' : 'N/A'}`);
          lines.push(`5Y Return: ${data.fund.return5y ? data.fund.return5y + '%' : 'N/A'}`);
        }
        break;

      case 'ipo':
        if (data.ipos) {
          lines.push(`\n[IPO Open List - ${data.count} IPOs]`);
          lines.push(`DISCLAIMER: ${result.data.message}`);
          data.ipos.forEach((ipo: any) => {
            lines.push(`\n- ${ipo.name} (${ipo.symbol})`);
            lines.push(`  Type: ${ipo.type}`);
            lines.push(`  Price Range: ${ipo.priceRange}`);
            lines.push(`  Issue Size: ${ipo.issueSize}`);
            lines.push(`  Dates: ${ipo.startDate} to ${ipo.endDate}`);
          });
        } else if (data.ipo) {
          const ipo = data.ipo;
          lines.push(`\n[IPO Details: ${ipo.name}]`);
          lines.push(`DISCLAIMER: ${result.data.disclaimer}`);
          lines.push(`Symbol: ${ipo.symbol} | Type: ${ipo.type} | Status: ${ipo.status}`);
          lines.push(`Price Range: ${ipo.priceRange} | Min Qty: ${ipo.minQty} | Min Amt: ${ipo.minAmount}`);
          lines.push(`Issue Size: ${ipo.issueSize}`);
          lines.push(`Dates: ${ipo.startDate} to ${ipo.endDate} (Listing: ${ipo.listingDate})`);
          if (ipo.about) lines.push(`About: ${ipo.about}`);
          if (ipo.schedule?.length) {
            lines.push('Schedule:');
            ipo.schedule.forEach((s: any) => lines.push(`  - ${s.event}: ${s.date}`));
          }
        } else if (data.options) {
          lines.push(`\n[IPO Search]`);
          lines.push(result.data.message);
          data.options.forEach((opt: string) => lines.push(` - ${opt}`));
        }
        break;

      default:
        lines.push(`\n[${toolName}]: ${JSON.stringify(data).substring(0, 500)}`);
        break;
    }
  }

  return lines.join('\n');
}
