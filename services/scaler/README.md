# Scaler Service

The Scaler service is responsible for scaling applications based on metrics and alerts.

## Testing the Scaling Algorithm

The scaling algorithm tests might exceed the default timeout when run as a group. To run them correctly, you can use one of the following approaches:

### Run specific tests

```bash
# Run a specific test pattern using Node's test runner
node --test --test-only "constructor" ./test/lib/scaling-algorithm.test.js

# Or run individual tests with a longer timeout
npx borp -c 1 --timeout=10000 ./test/lib/scaling-algorithm.test.js
```

### Run individual test files

If you encounter timeout issues, run specific portions of the tests:

```bash
# For basic tests
node --test --test-only "calculateTrend|calculateVariability" ./test/lib/scaling-algorithm.test.js

# For metrics processing tests
node --test --test-only "processPodMetrics|getPerformanceSuccessScore" ./test/lib/scaling-algorithm.test.js

# For scaling decision tests
node --test --test-only "calculateScalingDecision" ./test/lib/scaling-algorithm.test.js

# For history and clustering tests
node --test --test-only "addPerfHistoryEvent|updateClusters" ./test/lib/scaling-algorithm.test.js
```

All individual tests should pass correctly when run with appropriate timeouts.