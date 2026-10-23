import { prisma } from '../../../config/prisma';
import { toolSuccess, toolError, toolNoData, ToolResult } from './tool.types';

/**
 * goal-analysis.tool.ts
 *
 * Analyses one or all goals for the authenticated user.
 * Progress is computed from the Goal.Savings relationship (Saving.goalId FK),
 * matching the exact logic in GoalService.
 */

export interface GoalData {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;           // Sum of Saving records linked to this goal
  remainingAmount: number;
  progressPct: number;           // 0–100
  targetDate: string | null;
  status: string;
  category: string | null;
  monthsRemaining: number | null;
  requiredMonthlySaving: number | null; // Calculated if targetDate is available
}

export interface GoalAnalysisData {
  goals: GoalData[];
  activeCount: number;
  completedCount: number;
  totalTargetAmount: number;
  totalSavedAmount: number;
}

function computeGoal(goal: any, savedAmount: number, now: Date): GoalData {
  const targetAmount    = Number(goal.targetAmount);
  const remainingAmount = Math.max(targetAmount - savedAmount, 0);
  const progressPct     = targetAmount > 0
    ? Math.min(parseFloat(((savedAmount / targetAmount) * 100).toFixed(1)), 100)
    : 0;

  let monthsRemaining: number | null = null;
  let requiredMonthlySaving: number | null = null;

  if (goal.targetDate) {
    const td = new Date(goal.targetDate);
    const ms = (td.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    monthsRemaining = ms > 0 ? Math.ceil(ms) : 0;
    if (monthsRemaining > 0 && remainingAmount > 0) {
      requiredMonthlySaving = parseFloat((remainingAmount / monthsRemaining).toFixed(2));
    } else if (remainingAmount <= 0) {
      requiredMonthlySaving = 0;
    }
  }

  return {
    id:                    goal.id,
    name:                  goal.name,
    description:           goal.description ?? null,
    targetAmount,
    savedAmount:           parseFloat(savedAmount.toFixed(2)),
    remainingAmount:       parseFloat(remainingAmount.toFixed(2)),
    progressPct,
    targetDate:            goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : null,
    status:                savedAmount >= targetAmount ? 'COMPLETED' : goal.status,
    category:              goal.category ?? null,
    monthsRemaining,
    requiredMonthlySaving,
  };
}

/**
 * Get analysis for all user goals or a specific goal by name/id.
 */
export async function getGoalAnalysis(
  userId: string,
  options: { goalName?: string; goalId?: string } = {}
): Promise<ToolResult<GoalAnalysisData | null>> {
  try {
    const now = new Date();

    const where: any = { userId };
    if (options.goalId)   where.id   = options.goalId;

    const goals = await prisma.goal.findMany({
      where,
      include: {
        Savings: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (goals.length === 0) {
      return toolNoData('goal_analysis');
    }

    // If filtering by name, do it in-memory (case-insensitive contains)
    let filteredGoals = goals;
    if (options.goalName) {
      const lower = options.goalName.toLowerCase();
      filteredGoals = goals.filter(g => g.name.toLowerCase().includes(lower));
    }

    if (filteredGoals.length === 0) {
      return toolNoData('goal_analysis');
    }

    const goalData = filteredGoals.map(g => {
      const savedAmount = g.Savings.reduce((s, sv) => s + Number(sv.amount), 0);
      return computeGoal(g, savedAmount, now);
    });

    const activeCount    = goalData.filter(g => g.status === 'ACTIVE').length;
    const completedCount = goalData.filter(g => g.status === 'COMPLETED').length;
    const totalTarget    = goalData.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved     = goalData.reduce((s, g) => s + g.savedAmount, 0);

    return toolSuccess('goal_analysis', {
      goals: goalData,
      activeCount,
      completedCount,
      totalTargetAmount: parseFloat(totalTarget.toFixed(2)),
      totalSavedAmount:  parseFloat(totalSaved.toFixed(2)),
    });
  } catch (err: any) {
    console.error('[AI Tool] goal_analysis error:', err.message);
    return toolError('goal_analysis', 'Could not retrieve your goal data right now.');
  }
}
