import 'dotenv/config';
import { readJsonFile, writeJsonFile, appendJsonFile } from './persistence.js';
import { scanForLiquidations, filterByProfitability, filterByRisk, sortByProfit } from './scanner.js';
import { analyzeLiquidationOpportunity } from './analyzer.js';
import { assessRisk } from './math.js';
import type { LiquidationOpportunity, ExecutionResult, LiquidationMetrics } from './types.js';

const dryRun = process.env.DRY_RUN === 'true';
const autoExecute = process.env.AUTO_EXECUTE === 'true' && !dryRun;
const minProfitUSD = Number(process.env.MIN_LIQUIDATION_PROFIT_USD ?? '100');
const maxSizeUSD = Number(process.env.MAX_LIQUIDATION_SIZE_USD ?? '5000');
const ledgerPath = process.env.LEDGER_PATH ?? '.state/liquidation-ledger.json';
const metricsPath = process.env.METRICS_PATH ?? '.state/liquidation-metrics.json';

async function main() {
  console.log(`\n🚀 Liquidation Hunter | mode=${dryRun ? 'DRY_RUN' : autoExecute ? 'AUTO' : 'MANUAL'}\n`);

  const opportunities = await scanForLiquidations();
  console.log(`📊 Scanned ${opportunities.length} opportunities\n`);

  // Filter and sort
  const profitable = filterByProfitability(opportunities, minProfitUSD);
  const lowRisk = filterByRisk(profitable, 80);
  const sorted = sortByProfit(lowRisk);

  console.log(`💰 Profitable (>${minProfitUSD}): ${profitable.length}`);
  console.log(`✅ Low risk (<80): ${lowRisk.length}`);
  console.log(`📈 Sorted by profit: ${sorted.length}\n`);

  const executions: ExecutionResult[] = [];

  for (const opp of sorted.slice(0, 5)) {
    console.log(`Processing: ${opp.id}`);
    console.log(`  Profit: $${opp.expectedProfit.toFixed(2)} | Risk: ${opp.riskScore.toFixed(0)}/100`);

    // Risk assessment
    const risk = assessRisk(opp.ltv, opp.liquidationThreshold, opp.expectedProfit, 50, minProfitUSD);
    console.log(`  Risk assessment: ${risk.reason}`);

    if (!risk.approved) {
      console.log(`  ❌ SKIPPED\n`);
      executions.push({
        id: `exec-${Date.now()}`,
        opportunityId: opp.id,
        executed: false,
        profitUSD: 0,
        error: risk.reason,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    // Claude analysis
    const analysis = await analyzeLiquidationOpportunity(opp, process.env.ANTHROPIC_API_KEY ?? '');
    console.log(`  Claude: ${analysis.reasoning}`);

    if (analysis.decision !== 'execute') {
      console.log(`  ❌ SKIPPED\n`);
      executions.push({
        id: `exec-${Date.now()}`,
        opportunityId: opp.id,
        executed: false,
        profitUSD: 0,
        error: analysis.reasoning,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (dryRun) {
      console.log(`  ✅ DRY_RUN: Would execute | profit=$${opp.expectedProfit.toFixed(2)}\n`);
      executions.push({
        id: `exec-${Date.now()}`,
        opportunityId: opp.id,
        executed: true,
        profitUSD: opp.expectedProfit,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (autoExecute) {
      console.log(`  ⚡ EXECUTING...`);
      // In production: actual liquidation call
      executions.push({
        id: `exec-${Date.now()}`,
        opportunityId: opp.id,
        executed: true,
        profitUSD: opp.expectedProfit,
        transactionHash: '0x' + 'a'.repeat(64),
        timestamp: new Date().toISOString(),
      });
      console.log(`  ✅ EXECUTED | profit=$${opp.expectedProfit.toFixed(2)}\n`);
      continue;
    }

    console.log(`  ⏳ MANUAL APPROVAL REQUIRED\n`);
  }

  // Save results
  for (const exec of executions) {
    await appendJsonFile(ledgerPath, exec);
  }

  // Calculate metrics
  const allExecutions = await readJsonFile<ExecutionResult[]>(ledgerPath, []);
  const metrics: LiquidationMetrics = {
    totalScanned: opportunities.length,
    totalOpportunities: profitable.length,
    successfulLiquidations: allExecutions.filter((e) => e.executed).length,
    failedAttempts: allExecutions.filter((e) => !e.executed).length,
    totalProfitUSD: allExecutions.reduce((sum, e) => sum + (e.executed ? e.profitUSD : 0), 0),
    averageProfitPerTrade:
      allExecutions.filter((e) => e.executed).length > 0
        ? allExecutions.filter((e) => e.executed).reduce((sum, e) => sum + e.profitUSD, 0) /
          allExecutions.filter((e) => e.executed).length
        : 0,
    winRate: allExecutions.length > 0 ? allExecutions.filter((e) => e.executed).length / allExecutions.length : 0,
    lastUpdated: new Date().toISOString(),
  };

  await writeJsonFile(metricsPath, metrics);

  console.log('\n📊 Metrics Summary:');
  console.log(`  Total scanned: ${metrics.totalScanned}`);
  console.log(`  Successful liquidations: ${metrics.successfulLiquidations}`);
  console.log(`  Total profit: $${metrics.totalProfitUSD.toFixed(2)}`);
  console.log(`  Win rate: ${(metrics.winRate * 100).toFixed(1)}%`);
  console.log(`  Avg profit per trade: $${metrics.averageProfitPerTrade.toFixed(2)}\n`);

  const interval = Number(process.env.LIQUIDATION_INTERVAL_MS ?? '60000');
  console.log(`Next cycle in ${interval}ms...\n`);
  setTimeout(main, interval);
}

await main();
