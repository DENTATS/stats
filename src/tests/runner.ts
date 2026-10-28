import { BENCHMARK_TESTS, BenchmarkCase } from './validationMatrix';

export interface TestExecutionResult {
  testId: string;
  name: string;
  category: string;
  referenceSource: string;
  passed: boolean;
  actual: any;
  message?: string;
  durationMs: number;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  results: TestExecutionResult[];
}

export async function runAllValidationTests(): Promise<TestSuiteSummary> {
  const startSuite = performance.now();
  const results: TestExecutionResult[] = [];
  let passedCount = 0;

  for (const test of BENCHMARK_TESTS) {
    const startTest = performance.now();
    try {
      const outcome = await test.run();
      const durationMs = performance.now() - startTest;
      if (outcome.passed) passedCount++;

      results.push({
        testId: test.id,
        name: test.name,
        category: test.category,
        referenceSource: test.referenceSource,
        passed: outcome.passed,
        actual: outcome.actual,
        message: outcome.message,
        durationMs: Number(durationMs.toFixed(2)),
      });
    } catch (err: any) {
      const durationMs = performance.now() - startTest;
      results.push({
        testId: test.id,
        name: test.name,
        category: test.category,
        referenceSource: test.referenceSource,
        passed: false,
        actual: null,
        message: `Execution error: ${err.message}`,
        durationMs: Number(durationMs.toFixed(2)),
      });
    }
  }

  const durationMs = performance.now() - startSuite;

  return {
    total: BENCHMARK_TESTS.length,
    passed: passedCount,
    failed: BENCHMARK_TESTS.length - passedCount,
    durationMs: Number(durationMs.toFixed(2)),
    timestamp: new Date().toISOString(),
    results,
  };
}
