export type LiquidationOpportunity = {
  id: string;
  protocol: 'aave' | 'compound' | 'morpho';
  borrower: string;
  collateralToken: string;
  debtToken: string;
  debtAmount: number;
  collateralAmount: number;
  ltv: number;
  liquidationThreshold: number;
  expectedProfit: number;
  riskScore: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: string;
};

export type ExecutionResult = {
  id: string;
  opportunityId: string;
  executed: boolean;
  profitUSD: number;
  transactionHash?: string;
  error?: string;
  timestamp: string;
};

export type LiquidationMetrics = {
  totalScanned: number;
  totalOpportunities: number;
  successfulLiquidations: number;
  failedAttempts: number;
  totalProfitUSD: number;
  averageProfitPerTrade: number;
  winRate: number;
  lastUpdated: string;
};

export type RiskAssessment = {
  opportunityId: string;
  ltvRatio: number;
  liquidationBonus: number;
  slippageRisk: number;
  gasCostUSD: number;
  netProfit: number;
  approved: boolean;
  reason: string;
};
