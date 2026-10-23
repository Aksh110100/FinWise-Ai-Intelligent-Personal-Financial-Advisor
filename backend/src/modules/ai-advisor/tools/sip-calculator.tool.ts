import { toolSuccess, toolError, ToolResult } from './tool.types';

/**
 * sip-calculator.tool.ts
 *
 * Pure mathematical SIP (Systematic Investment Plan) calculator.
 * No database queries. No external API calls.
 * Uses the standard SIP future-value formula.
 *
 * IMPORTANT: All projections are illustrative only and NOT guaranteed returns.
 */

export interface SIPCalculationData {
  monthlyInvestment: number;
  annualReturnRate: number;    // percentage, e.g. 12
  durationMonths: number;
  durationYears: number;
  futureValue: number;
  totalInvested: number;
  estimatedReturns: number;
  wealthGainPct: number;       // how much extra vs invested
  disclaimer: string;
}

/**
 * Calculate SIP future value.
 *
 * Formula: FV = P × [((1+r)^n - 1) / r] × (1+r)
 * where:
 *   P = monthly investment
 *   r = monthly interest rate = annualRate / 12 / 100
 *   n = number of months
 */
export function calculateSIP(params: {
  monthlyInvestment: number;
  annualReturnRate: number;  // e.g. 12 for 12%
  durationMonths: number;
}): ToolResult<SIPCalculationData> {
  const { monthlyInvestment, annualReturnRate, durationMonths } = params;

  // Validate inputs
  if (monthlyInvestment <= 0)  return toolError('sip_calculator', 'Monthly investment must be greater than zero.');
  if (annualReturnRate <= 0 || annualReturnRate > 100) return toolError('sip_calculator', 'Annual return rate must be between 1% and 100%.');
  if (durationMonths <= 0 || durationMonths > 600)     return toolError('sip_calculator', 'Duration must be between 1 month and 50 years.');

  const r  = annualReturnRate / 12 / 100;
  const n  = durationMonths;
  const P  = monthlyInvestment;

  // Standard SIP FV formula (beginning of period)
  const futureValue   = parseFloat((P * (((Math.pow(1 + r, n) - 1) / r) * (1 + r))).toFixed(2));
  const totalInvested = parseFloat((P * n).toFixed(2));
  const estReturns    = parseFloat((futureValue - totalInvested).toFixed(2));
  const wealthGainPct = parseFloat(((estReturns / totalInvested) * 100).toFixed(1));

  return toolSuccess('sip_calculator', {
    monthlyInvestment,
    annualReturnRate,
    durationMonths,
    durationYears: parseFloat((durationMonths / 12).toFixed(1)),
    futureValue,
    totalInvested,
    estimatedReturns: estReturns,
    wealthGainPct,
    disclaimer:
      `This projection assumes a constant annual return of ${annualReturnRate}%. ` +
      'Actual returns from mutual funds and SIPs are subject to market risk and may vary significantly. ' +
      'Past performance is not indicative of future returns. This is for illustrative purposes only and does not constitute investment advice.',
  });
}

/**
 * Calculate the monthly SIP required to reach a target amount in a given time.
 *
 * Inverted SIP formula: P = FV × r / [((1+r)^n - 1) × (1+r)]
 */
export function calculateRequiredSIP(params: {
  targetAmount: number;
  annualReturnRate: number;
  durationMonths: number;
}): ToolResult<{ requiredMonthlySIP: number; disclaimer: string }> {
  const { targetAmount, annualReturnRate, durationMonths } = params;

  if (targetAmount <= 0)      return toolError('sip_calculator', 'Target amount must be greater than zero.');
  if (durationMonths <= 0)    return toolError('sip_calculator', 'Duration must be greater than zero months.');
  if (annualReturnRate <= 0)  return toolError('sip_calculator', 'Annual return rate must be greater than zero.');

  const r  = annualReturnRate / 12 / 100;
  const n  = durationMonths;
  const FV = targetAmount;

  const requiredMonthlySIP = parseFloat(
    (FV * r / ((Math.pow(1 + r, n) - 1) * (1 + r))).toFixed(2)
  );

  return toolSuccess('sip_calculator', {
    requiredMonthlySIP,
    disclaimer:
      `Assumes constant ${annualReturnRate}% annual return. ` +
      'Actual returns are subject to market risk and are not guaranteed. For illustrative purposes only.',
  });
}
