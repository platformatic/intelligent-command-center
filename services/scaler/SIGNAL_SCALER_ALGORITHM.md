# Signal Scaler Algorithm

## Overview

The Signal Scaler Algorithm is a time-window-based autoscaling system that supports multiple types of signals (not limited to ELU and HEAP). It analyzes event rates across different time windows to make intelligent scaling decisions.

## Architecture

### Event Model

An **event** is defined as a signals batch received from a pod, indicating that at least one of the watt applications was unhealthy at that time. Events can contain any number and type of signals (CPU, memory, latency, error rate, etc.).

### Time Windows

The algorithm uses three overlapping time windows for analysis:

- **FW (Fast Window)**: 15 seconds - for detecting immediate issues
- **SW (Slow Window)**: 60 seconds - for confirming trends
- **LW (Long Window)**: 300 seconds (5 minutes) - for scale-down decisions

## Algorithm Definitions

### Thresholds

| Threshold | Default Value | Purpose |
|-----------|--------------|---------|
| `HOT_RATE_THRESHOLD` | 0.5 | Maximum rate threshold for hotspot detection |
| `SCALE_UP_FW_RATE_THRESHOLD` | 0.2 | Fast window rate threshold for breadth scaling |
| `SCALE_UP_SW_RATE_THRESHOLD` | 0.15 | Slow window rate threshold for breadth scaling |
| `SCALE_DOWN_SW_RATE_THRESHOLD` | 0.05 | Slow window rate threshold for scale down |
| `SCALE_DOWN_LW_RATE_THRESHOLD` | 0.03 | Long window rate threshold for scale down |

### Metrics

For each pod `p` and time window `W`:

1. **Event Count**: `count_p(W) = #events in (now - W, now]`
2. **Event Rate**: `rate_p(W) = count_p(W) / W` (events per second)
3. **Average Rate**: `rate_watt(W) = mean_p(rate_p(W))`
4. **Maximum Rate**: `max_rate_pod(W) = max_p(rate_p(W))`

## Scaling Logic

### Scale Up: + Math.ceil(n/2)

The algorithm scales up by adding `Math.ceil(currentPodCount / 2)` pods when **either** of these conditions is met:

#### 5.1. Hotspot Detection (Any single pod is hot)

```
max_rate_pod(FW) > HOT_RATE_THRESHOLD
```

**Rationale**: A single pod experiencing high event rates indicates a potential hotspot that needs immediate relief, even if other pods are healthy.

#### 5.2. Breadth Scaling (All pods are hot)

```
rate_watt(FW) > SCALE_UP_FW_RATE_THRESHOLD AND
rate_watt(SW) > SCALE_UP_SW_RATE_THRESHOLD
```

**Rationale**: When average rates are high across both windows, the entire application is under increasing load.

**Example**:
- 2 pods → scale up by Math.ceil(2/2) = 1 → 3 pods
- 5 pods → scale up by Math.ceil(5/2) = 3 → 8 pods
- 10 pods → scale up by Math.ceil(10/2) = 5 → 15 pods

### Scale Down: -1

The algorithm scales down by removing **1 pod** when **all** of these conditions are met:

```
rate_watt(FW) = 0 AND
rate_watt(SW) <= SCALE_DOWN_SW_RATE_THRESHOLD AND
rate_watt(LW) <= SCALE_DOWN_LW_RATE_THRESHOLD
```

**Rationale**: Scale down conservatively, only when there are no recent events and rates are consistently low across all time windows.

### Cooldown Periods

Cooldowns prevent rapid scaling oscillations:

1. **After Scale Up**: Forbid scale down for **SW** (60s)
2. **After Scale Down**: Forbid scale down for **SW** (60s)
3. **After Scale Down**: Forbid scale up for **FW** (15s)

## Implementation Details

### Signals storage

Signals are stored in Redis/Valkey with the following key pattern:

```
reactive:signals:app:{applicationId}:pod:{podId}:signal:{signalId}
```

Events are automatically expired after `LW` (300 seconds) to prevent memory buildup.

### Cooldown Storage

Cooldown timestamps are stored in Redis/Valkey:

```
reactive:cooldown:scaleup:{applicationId}
reactive:cooldown:scaledown:{applicationId}
```

### Configuration

The algorithm can be configured with custom options:

```javascript
const algorithm = new MultiSignalReactiveAlgorithm(app, {
  FW: 15000,                           // Fast window (ms)
  SW: 60000,                           // Slow window (ms)
  LW: 300000,                          // Long window (ms)
  HOT_RATE_THRESHOLD: 0.5,
  SCALE_UP_FW_RATE_THRESHOLD: 0.05,
  SCALE_UP_SW_RATE_THRESHOLD: 0.05,
  SCALE_DOWN_SW_RATE_THRESHOLD: 0.01,
  SCALE_DOWN_LW_RATE_THRESHOLD: 0.004,
  minPodsDefault: 1,
  maxPodsDefault: 10
})
```

## Usage Example

### Storing Signal Events

```javascript
await algorithm.storeSignal(applicationId, podId, {
  type: 'cpu',
  value: 0.85,
  timestamp: Date.now()
})
```

### Making Scaling Decisions

```javascript
const decision = await algorithm.calculateScalingDecision(
  applicationId,
  currentPodCount,
  minPods,
  maxPods
)

// decision = {
//   nfinal: 5,
//   reason: 'Hotspot detected (max rate 0.673 > 0.5)'
// }
```

## Advantages

1. **Multi-Signal Support**: Not limited to specific metrics like ELU or HEAP
2. **Flexible Event Model**: Each application can have different signal types
3. **Fast Response**: 15-second fast window detects issues quickly
4. **Trend Confirmation**: Multiple time windows prevent false positives
5. **Aggressive Scale Up**: Scales by 50% of current capacity for rapid response
6. **Conservative Scale Down**: Removes only 1 pod at a time to prevent over-correction
7. **Hotspot Detection**: Identifies and responds to single-pod issues

## Comparison to ELU/HEAP Algorithm

| Feature | Multi-Signal Reactive | ELU/HEAP Reactive |
|---------|----------------------|-------------------|
| Signal Types | Any/Multiple | ELU and HEAP only |
| Scale Up Amount | +Math.ceil(n/2) | Variable based on scores |
| Time Windows | 3 (FW/SW/LW) | Single cooldown |
| Hotspot Detection | Yes (per-pod max rate) | Yes (immediate triggers) |
| Historical Learning | No | Yes (clusters) |
| Complexity | Low | High |

## File Location

- **Implementation**: `lib/multi-signal-reactive-algorithm.js`
- **Tests**: `test/lib/multi-signal-reactive-algorithm.test.js`
