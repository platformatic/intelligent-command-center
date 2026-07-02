# Autoscaling Algorithms Documentation

The scaler service supports two autoscaling algorithms, selected per deployment via the
`PLT_SCALER_ALGORITHM_VERSION` environment variable (`v1` | `v2`):

1. **Reactive Scaling Algorithm (v1)** — responds in real time to ELU/HEAP performance
   signals. Documented below.
2. **Signal Scaler / Load Predictor (v2)** — a predictive load forecaster over per-worker
   signal streams. See `SIGNAL_SCALER_ALGORITHM.md`.

This document describes the **reactive** algorithm.

## Reactive Scaling Algorithm (v1)

### Key parameters

- **ELU threshold (τ_e)**: 0.9 (90%)
- **HEAP threshold (τ_h)**: 0.85 (85%)
- **Cooldown period (C)**: 300 seconds
- **Post-scaling window (T_post)**: 300 seconds
- **Maximum history events (K_max)**: 10
- **Maximum clusters (C_max)**: 5
- **Minimum pods (default)**: 1
- **Maximum pods (default)**: 10

These are the algorithm defaults. The executor and environment can override them — for
example `PLT_SCALER_ELU_THRESHOLD`, `PLT_SCALER_HEAP_THRESHOLD`, `PLT_SCALER_COOLDOWN`,
`PLT_SCALER_MAX_HISTORY`, `PLT_SCALER_MIN_PODS_DEFAULT`, `PLT_SCALER_MAX_PODS_DEFAULT`.

### Architecture

Modular design with separated concerns:

- `lib/reactive-scaling-algorithm.js` — core reactive scaling logic
- `lib/performance-history.js` — history management and post-scaling evaluation
- `lib/scaling-algorithm-utils.js` — shared utility functions

### Data persistence

- Performance history is kept in a Valkey ring buffer (last `K_max` events) per application.
- Clusters are stored per application in Valkey.
- The last scaling time is tracked in Valkey and used to enforce cooldowns.

### Integration with Kubernetes

- Real pod metrics from Prometheus time-series data.
- Alert-based metrics from health monitoring.
- Actual deployment scaling operations through the machinist service.

### Core workflow

1. Signal collection when ELU/HEAP cross thresholds.
2. Performance history collection.
3. Cluster maintenance (up to 5 clusters).
4. Signal evaluation and pod metrics analysis.
5. Replica comparison.
6. Scaling decision with cooldown.
7. Pod management via machinist.

### Scale-up

The decision returns `nfinal` — the total desired pod count after scaling. The base amount
scales with the fraction of pods that triggered, and is amplified when the
performance-weighted ELU/HEAP score is high, then capped to the maximum pod count.

### Scale-down

Scale-down logic removes capacity when utilization is low:

```javascript
// Scale down when utilization is well below thresholds
if ((avgElu < this.eluThreshold * 0.5 || avgHeap < this.heapThreshold * 0.5) &&
    currentPodCount > minPodsValue) {
    // Calculate scale-down based on utilization ratio
    const utilizationRatio = Math.max(avgElu / this.eluThreshold, avgHeap / this.heapThreshold)
    const scaleDownFactor = 0.3 * (1 - utilizationRatio)
    const podsToRemove = Math.max(1, Math.floor(currentPodCount * scaleDownFactor))
    // ...
}
```

Scale-down only happens on periodic (alert-free) checks; alert-triggered evaluations never
scale down.

### Alert integration

Alert data is merged with Prometheus metrics:

- Current ELU/heap values from alerts.
- Historical health data from alerts (last 20 entries).
- Priority given to recent data points.

### Minimum / maximum pod enforcement

The minimum pod count is enforced explicitly: if the current count is below the configured
minimum, the algorithm scales up to the minimum regardless of utilization. Scale-up is
likewise capped to the configured maximum.

### Immediate triggers

ELU ≥ 95% or normalized HEAP ≥ 90% trigger scaling immediately, bypassing the gradual
score-based path.

### Post-scaling evaluation

After `T_post` (300 seconds) a post-scaling evaluation runs:

- Fetches current metrics and computes ELU/HEAP deltas and variability versus the
  pre-scaling snapshot.
- Updates clusters with the observed event (performance-weighted, Euclidean distance for
  similarity).
- Signal-sourced events score 1.0.

## Performance History Management

- Valkey ring buffer capped at `K_max` events per application.
- Post-scaling evaluation updates the stored event and the per-application clusters.
- Clustering uses Euclidean distance over (ELU mean, HEAP mean, ELU trend, HEAP trend) with
  performance-weighted incremental updates and a maximum of `C_max` clusters.

## Utility Functions

- Linear regression for trend calculation.
- Standard deviation for variability.
- Euclidean distance for clustering.
- Performance scoring based on similarity to historically successful clusters.
- Normalization of heap values (assumes an 8 GB maximum).

## Configuration Parameters

```javascript
maxHistoryEvents: 10       // Valkey ring buffer size
maxClusters: 5
eluThreshold: 0.9
heapThreshold: 0.85
postScalingWindow: 300     // seconds
cooldownPeriod: 300        // seconds (see PLT_SCALER_COOLDOWN)
minPodsDefault: 1
maxPodsDefault: 10
```
