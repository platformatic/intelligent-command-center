# Autoscaling Algorithms Documentation

This document describes the intelligent autoscaling algorithms implemented in the scaler service, comparing the reference implementation with the actual production implementation.

## Overview

The system implements a dual-algorithm framework for intelligent autoscaling:

1. **Reactive Scaling Algorithm** - Responds in real-time to performance signals (ELU > 90%)
2. **Trends Learning Algorithm** - Analyzes historical patterns to predict future scaling needs

## Algorithm Specifications

### Mathematical Foundation

The algorithms are based on the whitepaper "Intelligent Autoscaling for Node.js Applications with Reactive and Predictive Scaling" (June 9, 2025), which provides detailed mathematical formulations for both algorithms.

Key parameters from the specification:
- **ELU Threshold (τ_e)**: 0.9 (90%)
- **HEAP Threshold (τ_h)**: 0.85 (85%)
- **3-day half-life decay (λ)**: ln(2)/259200 ≈ 2.674 × 10^-6
- **Cooldown period (C)**: 300 seconds
- **Post-scaling window (T_post)**: 300 seconds
- **Maximum history events (K_max)**: 1000
- **Maximum clusters (C_max)**: 5
- **Prediction window (W_pred)**: ±30 seconds
- **Confidence threshold (π_thresh)**: 0.8

## Production Implementation Architecture

### Key Differences from Reference Implementation

#### 1. **Modular Architecture**
- **Reference**: Single-file implementation with classes in one Node.js file
- **Production**: Modular design with separated concerns:
  - `reactive-scaling-algorithm.js` - Core reactive scaling logic
  - `trends-learning-algorithm.js` - Predictive scaling logic
  - `performance-history.js` - History management and evaluation
  - `scaling-algorithm-utils.js` - Shared utility functions

#### 2. **Data Persistence**
- **Reference**: In-memory storage for history and predictions
- **Production**: PostgreSQL database integration with proper schema:
  - Performance history stored in `performance_history` table
  - Clusters stored per application
  - Last scaling time tracked in database

#### 3. **Integration with Kubernetes**
- **Reference**: Simulated pod management with Set data structure
- **Production**: Full integration with Kubernetes API through control-plane service
  - Real pod metrics from Prometheus
  - Actual deployment scaling operations
  - Health status monitoring

#### 4. **Metrics Collection**
- **Reference**: Simulated metrics with random data
- **Production**: Real metrics from multiple sources:
  - Prometheus time-series data
  - Alert-based metrics from health monitoring
  - Historical health data integration

#### 5. **API Design**
- **Reference**: Basic Fastify endpoints for testing
- **Production**: Comprehensive API with:
  - Structured request/response models
  - Database entity management
  - Error handling and validation
  - Integration with other microservices

## Algorithm Implementation Details

### Reactive Scaling Algorithm

#### Core Workflow (Both Implementations)
1. Signal collection when ELU > 90%
2. Performance history collection
3. Cluster maintenance (5 clusters max)
4. Signal evaluation and pod metrics analysis
5. Prediction integration
6. Replicaset comparison
7. Scaling decision with cooldown
8. Pod management

#### Major Enhancements in Production

##### 1. **Scale-Down Functionality** (NOT in mathematical specification)
The production implementation adds comprehensive scale-down logic that is completely absent from the mathematical specification:

```javascript
// Production implementation adds scale-down when utilization is low
if ((avgElu < this.eluThreshold * 0.5 || avgHeap < this.heapThreshold * 0.5) && 
    currentPodCount > minPodsValue) {
    // Calculate scale-down based on utilization ratio
    const utilizationRatio = Math.max(avgElu / this.eluThreshold, avgHeap / this.heapThreshold)
    const scaleDownFactor = 0.3 * (1 - utilizationRatio)
    const podsToRemove = Math.max(1, Math.floor(currentPodCount * scaleDownFactor))
    // ...
}
```

**Rationale**: Production environments require both scale-up and scale-down to optimize resource utilization and costs.

##### 2. **Alert Integration**
Production implementation merges alert data with Prometheus metrics:
- Current ELU/heap values from alerts
- Historical health data from alerts (last 20 entries)
- Priority given to recent data points

##### 3. **API Clarity Enhancement**
- **Reference**: Returns number of pods to add/remove
- **Production**: Returns `nfinal` - the total desired pod count after scaling
- This improves API clarity and reduces confusion

##### 4. **Minimum Pod Enforcement**
Production explicitly enforces minimum pod count, which the mathematical spec mentions but doesn't implement.

### Trends Learning Algorithm

#### Core Workflow (Both Implementations)
1. Historical data extraction (30-day history)
2. Time-slot analysis with 3-day decay weighting
3. Sequence modeling for scale-down patterns
4. Prediction validation
5. Prediction generation with embedded reasons

#### Key Implementation Differences

##### 1. **Data Source**
- **Reference**: In-memory array of events
- **Production**: Database queries with proper filtering and ordering

##### 2. **Time Handling**
- **Reference**: Uses seconds for all calculations
- **Production**: Uses milliseconds internally, converts as needed

##### 3. **Integration Method**
- **Reference**: Stores predictions in memory, queried via endpoint
- **Production**: On-demand prediction generation with `getCurrentPrediction()` method

##### 4. **Scheduling**
- **Reference**: Uses node-cron for hourly execution
- **Production**: Integrated with cron service using leader election

## Performance History Management

### Production Enhancements

1. **Database Persistence**
   - Upsert logic to prevent duplicates
   - Proper timestamp handling
   - Transaction support

2. **Post-Scaling Evaluation**
   - Scheduled evaluation after 300 seconds
   - Success score calculation based on:
     - Responsiveness (70%): ELU/HEAP below thresholds
     - Resource optimization (30%): Optimal pod utilization

3. **Cluster Updates**
   - Dynamic cluster creation and updates
   - Performance-weighted cluster management
   - Euclidean distance for similarity

## Utility Functions

Both implementations share similar utility functions:
- Linear regression for trend calculation
- Standard deviation for variability
- Euclidean distance for clustering
- Performance scoring based on historical similarity

Production adds:
- Normalization of heap values (assumes 8GB max)
- Immediate triggers for ELU ≥ 95% or HEAP ≥ 90%
- Modular cluster update logic

## Configuration Parameters

### Production Default Values
```javascript
// Reactive Scaling
maxHistoryEvents: 10       // Reduced from 1000 in spec
maxClusters: 5            // Same as spec
eluThreshold: 0.9         // Same as spec
heapThreshold: 0.85       // Same as spec
postScalingWindow: 300    // Same as spec
cooldownPeriod: 300       // Same as spec
minPodsDefault: 1         // Production addition
maxPodsDefault: 10        // Production addition

// Trends Learning
lambda: Math.log(2) / 259200  // Same as spec
maxHistoryEvents: 1000        // Same as spec
timeSlotWindow: 1800          // Same as spec
predictionWindow: 30          // Same as spec
confidenceThreshold: 0.8      // Same as spec
sequenceWindow: 600           // Same as spec
```

## Key Improvements in Production

1. **Reliability**: Database persistence ensures history survives restarts
2. **Scalability**: Modular design allows independent scaling of components
3. **Observability**: Integration with metrics and logging infrastructure
4. **Flexibility**: Configurable parameters per application
5. **Production-Ready**: Proper error handling, validation, and recovery
6. **Resource Efficiency**: Scale-down capability prevents over-provisioning

## Summary

The production implementation faithfully implements the mathematical specifications while adding crucial production features:
- Database persistence instead of in-memory storage
- Real metrics integration instead of simulated data
- Scale-down functionality (major addition not in spec)
- Modular architecture for maintainability
- Production-grade error handling and logging
- Integration with Kubernetes and monitoring systems

The core algorithms remain true to the mathematical formulations while the implementation adapts them for real-world production use.