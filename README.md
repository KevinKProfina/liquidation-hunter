# Liquidation Hunter

Autonomous liquidation detection and execution system for Solana and EVM lending protocols.

## Purpose

The liquidation hunter identifies undercollateralized lending positions and executes profitable liquidations. Unlike trading strategies with variable outcomes, liquidations are mathematically guaranteed profitable when executed correctly.

## How it works

1. **Scan** — Find undercollateralized positions on Aave, Compound, Morpho
2. **Filter** — Keep only positions with sufficient profit margin
3. **Assess** — Evaluate risk: LTV ratio, gas costs, volatility
4. **Analyze** — Claude reviews opportunity and approves/rejects
5. **Execute** — If approved, execute the liquidation and collect profit
6. **Report** — Track metrics and profitability

## Key metrics

- **LTV (Loan-to-Value)** — debt / collateral ratio
- **Liquidation threshold** — LTV level that triggers liquidation
- **Liquidation bonus** — extra collateral received as incentive
- **Expected profit** — bonus + slippage gains - gas costs

## Risk gates

- Position must be undercollateralized (LTV > threshold)
- Expected profit must exceed minimum threshold ($100+ by default)
- Gas costs must be <30% of expected profit
- LTV margin must be safe (not too close to threshold)

## Setup

```bash
npm install
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and SOLANA_PRIVATE_KEY
```

## Run modes

```bash
# Dry run (simulation only)
npm run dev

# Manual approval per opportunity
AUTO_EXECUTE=false npm run dev

# Fully automated
AUTO_EXECUTE=true DRY_RUN=false npm run dev
```

## Financial model

Typical liquidation: $500 — $5000 profit per execution
Frequency: 5-20 per day in active market conditions
Expected monthly: $7.5k — $150k (depends on market)

## Integration

The liquidation hunter reports metrics to:
```
.state/liquidation-metrics.json
```

The capital allocator reads this file and decides how much capital to allocate to liquidations vs. other strategies.

## Next stage

The orchestrator will automatically scale this strategy based on profitability and available opportunities, shifting capital between liquidation-hunter and solana-trader based on performance.
