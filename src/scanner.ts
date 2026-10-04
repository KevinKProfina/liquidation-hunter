import 'dotenv/config';
import { calculateLTV, isUndercollateralized, estimateLiquidationProfit, assessRisk } from './math.js';
import type { LiquidationOpportunity, LiquidationMetrics } from './types.js';

const minProfitUSD = Number(process.env.MIN_LIQUIDATION_PROFIT_USD ?? '100');

// Mock scan for Aave-like undercollateralized positions
export async function scanForLiquidations(): Promise<LiquidationOpportunity[]> {
  console.log('🔍 Scanning for liquidation opportunities...');

  // In production, this would call real Aave/Compound/Morpho APIs
  const mockOpportunities: LiquidationOpportunity[] = [
    {
      id: 'liq-001',
      protocol: 'aave',
      borrower: '0x' + 'a'.repeat(40),
      collateralToken: 'ETH',
      debtToken: 'USDC',
      debtAmount: 100000,
      collateralAmount: 50,
      ltv: 82,
      liquidationThreshold: 80,
      expectedProfit: 500,
      riskScore: 72,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'liq-002',
      protocol: 'compound',
      borrower: '0x' + 'b'.repeat(40),
      collateralToken: 'WBTC',
      debtToken: 'DAI',
      debtAmount: 250000,
      collateralAmount: 8,
      ltv: 85,
      liquidationThreshold: 80,
      expectedProfit: 1200,
      riskScore: 65,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'liq-003',
      protocol: 'morpho',
      borrower: '0x' + 'c'.repeat(40),
      collateralToken: 'USDC',
      debtToken: 'ETH',
      debtAmount: 50,
      collateralAmount: 150000,
      ltv: 78,
      liquidationThreshold: 80,
      expectedProfit: 0,
      riskScore: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ];

  // Filter for undercollateralized positions
  const filtered = mockOpportunities.filter((opp) => isUndercollateralized(opp.ltv, opp.liquidationThreshold));

  console.log(`✓ Found ${filtered.length} undercollateralized positions`);
  return filtered;
}

export function filterByProfitability(opportunities: LiquidationOpportunity[], minProfit: number): LiquidationOpportunity[] {
  return opportunities.filter((opp) => opp.expectedProfit >= minProfit);
}

export function filterByRisk(opportunities: LiquidationOpportunity[], maxRiskScore: number): LiquidationOpportunity[] {
  return opportunities.filter((opp) => opp.riskScore <= maxRiskScore);
}

export function sortByProfit(opportunities: LiquidationOpportunity[]): LiquidationOpportunity[] {
  return opportunities.sort((a, b) => b.expectedProfit - a.expectedProfit);
}

export function calculateMetrics(executions: { profitUSD: number; executed: boolean }[]): LiquidationMetrics {
  const successful = executions.filter((e) => e.executed).length;
  const total = executions.length;
  const totalProfit = executions.reduce((sum, e) => sum + (e.executed ? e.profitUSD : 0), 0);

  return {
    totalScanned: total,
    totalOpportunities: total,
    successfulLiquidations: successful,
    failedAttempts: total - successful,
    totalProfitUSD: totalProfit,
    averageProfitPerTrade: total > 0 ? totalProfit / successful : 0,
    winRate: total > 0 ? successful / total : 0,
    lastUpdated: new Date().toISOString(),
  };
}
