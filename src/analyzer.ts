import Anthropic from '@anthropic-ai/sdk';
import type { LiquidationOpportunity } from './types.js';

export async function analyzeLiquidationOpportunity(
  opportunity: LiquidationOpportunity,
  anthropicKey: string,
): Promise<{ decision: 'execute' | 'skip'; reasoning: string }> {
  const client = new Anthropic({ apiKey: anthropicKey });

  const prompt = `You are a risk-aware liquidation strategy evaluator.

Liquidation Opportunity:
- Protocol: ${opportunity.protocol}
- Borrower: ${opportunity.borrower}
- Collateral: ${opportunity.collateralToken}
- Debt: ${opportunity.debtToken}
- LTV: ${opportunity.ltv.toFixed(2)}% (threshold: ${opportunity.liquidationThreshold.toFixed(2)}%)
- Expected Profit: $${opportunity.expectedProfit.toFixed(2)}
- Risk Score: ${opportunity.riskScore.toFixed(0)}/100

Decision: Should we execute this liquidation?
Return ONLY: "EXECUTE: <brief reason>" or "SKIP: <brief reason>"`;

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join(' ')
    .toUpperCase();

  const decision = text.startsWith('EXECUTE') ? 'execute' : 'skip';
  const reasoning = text.substring(text.indexOf(':') + 1).trim();

  return { decision, reasoning };
}
