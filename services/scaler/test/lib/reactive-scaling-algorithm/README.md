# Scaler Algorithm Test Data

This directory contains test files for the scaling algorithm implementation.

## Test Files

### Unit Tests
- `scaling-down.test.js` - Comprehensive tests for scaling down behavior including:
  - Basic scaling down with low utilization metrics
  - Progressive scaling down and stopping behavior
- `scaling-up.test.js` - Tests for real alert structure processing and scaling up behavior including:
  - Processing real alert format with ELU, heap, and healthHistory data
  - Immediate scaling triggers for very high utilization (>95% ELU)

### Test Data Files

#### `metrics-low.json`
Real metrics data from 2 pods with very low utilization:
- **ELU**: ~2% (well below 90% threshold)
- **Heap**: ~0.75% (well below 85% threshold)
- **Expected behavior**: Scale down due to low utilization

#### `metrics-very-low.json`
Synthetic metrics data from 4 pods with extremely low utilization:
- **ELU**: ~5% (well below 45% scale-down threshold)
- **Heap**: ~0.6% (well below 42.5% scale-down threshold)
- **Expected behavior**: Scale down due to very low utilization

#### `metrics-moderate.json`
Synthetic metrics data from 2 pods with moderate utilization:
- **ELU**: ~50% (above 45% scale-down threshold, below 90% scale-up threshold)
- **Heap**: ~43% (above 42.5% scale-down threshold, below 85% scale-up threshold)
- **Expected behavior**: No scaling (maintain current pod count)

#### `alert.json`
Real alert data with complete structure:
- **Current ELU**: 99.67% (triggers immediate scale-up)
- **Heap Used**: 63.30 MB, **Heap Total**: 112.53 MB (~56% utilization)
- **Health History**: 60 time-series entries with ELU and heap metrics
- **Format**: `{podId, elu, heapUsed, heapTotal, unhealthy, timestamp, healthHistory}`
- **Expected behavior**: Immediate scale up due to >95% ELU trigger

## Scaling Thresholds

The algorithm uses the following thresholds:

### Scale Up Triggers
- ELU > 90% OR Heap > 85%
- **Immediate Triggers**: ELU > 95% OR Heap > 90% (bypass historical scoring)

### Scale Down Triggers
- ELU < 45% (50% of 90%) AND Heap < 42.5% (50% of 85%)

### No Scaling Zone
- ELU between 45% and 90% AND Heap between 42.5% and 85%

## Test Scenarios

### Scaling Down Tests (`scaling-down.test.js`)

1. **Basic Scale Down**: Start with 2 pods → Scale down to 1 pod (respecting minimum)
   - Uses `metrics-low.json` with very low utilization
   - Validates single scaling decision and boundary enforcement

2. **Progressive Scaling**: Start with 4 pods → Scale down to 3 pods → Stop scaling with moderate metrics  
   - Phase 1: Uses `metrics-very-low.json` to trigger initial scale down
   - Phase 2: Uses `metrics-moderate.json` to demonstrate scaling cessation
   - Validates multi-phase scaling behavior and decision logic

### Scaling Up Tests (`scaling-up.test.js`)

1. **Real Alert Structure Processing**: Tests the algorithm's ability to process real-world alert data
   - Uses `alert.json` containing actual alert structure with 99.67% ELU and healthHistory data
   - Validates alert format: `{elu, heapUsed, heapTotal, unhealthy, healthHistory}`
   - Verifies immediate scaling triggers for peak utilization (>95% ELU, >90% heap)
   - Tests healthHistory processing with focus on recent data points to maintain scaling urgency