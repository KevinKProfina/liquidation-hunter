export function calculateLTV(collateralValueUSD: number, debtValueUSD: number): number {
  if (debtValueUSD === 0) return 0;
  return (debtValueUSD / collateralValueUSD) * 100;
}

export function isUndercollateralized(ltv: number, liquidationThreshold: number): boolean {
  return ltv > liquidationThreshold;
}

export function estimateLiquidationProfit(
  debtValueUSD: number,
  collateralValueUSD: number,
  liquidationBonus: number,
  gasCostUSD: number,
): number {
  const repaidDebt = debtValueUSD;
  const receivedCollateral = collateralValueUSD * (1 + liquidationBonus / 100);
  const grossProfit = receivedCollateral - repaidDebt;
  return Math.max(0, grossProfit - gasCostUSD);
}

export function assessRisk(
  ltv: number,
  liquidationThreshold: number,
  expectedProfit: number,
  gasCostUSD: number,
  minProfitUSD: number,
): { approved: boolean; score: number; reason: string } {
  let score = 100;
  const reasons: string[] = [];

  if (!isUndercollateralized(ltv, liquidationThreshold)) {
    score = 0;
    reasons.push('position is not undercollateralized');
    return { approved: false, score, reason: reasons.join('; ') };
  }

  if (expectedProfit < minProfitUSD) {
    score -= 40;
    reasons.push(`profit below minimum ($${expectedProfit.toFixed(2)} < $${minProfitUSD})`);
  }

  if (gasCostUSD > expectedProfit * 0.3) {
    score -= 30;
    reasons.push('gas cost too high relative to profit');
  }

  const ltvMargin = liquidationThreshold - ltv;
  if (Math.abs(ltvMargin) < 0.5) {
    score -= 20;
    reasons.push('ltv too close to liquidation threshold (high volatility risk)');
  }

  const approved = score >= 50 && expectedProfit > minProfitUSD * 0.8;
  return {
    approved,
    score: Math.max(0, score),
    reason: approved ? 'opportunity approved for execution' : reasons.join('; '),
  };
}
