# Integration Guide: Clawdbot Operations Tracking

This guide explains how to integrate operation tracking into Clawdbot so the kanban board can display real-time observability.

## Overview

The kanban board requires operation data to be tracked and exposed via:
1. REST API endpoints for fetching operations
2. WebSocket endpoint for real-time updates

## Operation Lifecycle

### 1. Operation Creation

When an operation starts (e.g., skill execution begins), create an operation record:

```typescript
interface CreateOperationRequest {
  type: 'skill' | 'tool_call' | 'agent_task' | 'webhook' | 'scheduled';
  name: string;
  description?: string;
  skillName?: string;  // If type is 'skill'
  agentId?: string;
  userId?: string;
  channel?: string;
  steps: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  metadata?: Record<string, any>;
  tags?: string[];
}
```

### 2. Step Updates

As the operation progresses, update step status:

```typescript
// Mark step as running
await updateStep(operationId, stepId, {
  status: 'running',
  startedAt: new Date().toISOString(),
});

// Mark step as completed
await updateStep(operationId, stepId, {
  status: 'completed',
  completedAt: new Date().toISOString(),
  duration: calculateDuration(startedAt, completedAt),
});
```

### 3. Token Tracking

Track token usage from LLM API responses:

```typescript
await updateOperationMetrics(operationId, {
  tokens: {
    prompt: response.usage.prompt_tokens,
    completion: response.usage.completion_tokens,
    total: response.usage.total_tokens,
    cost: calculateCost(response.usage.total_tokens, model),
    model: model,
  },
});
```

### 4. Activity Updates

Update current activity/step information:

```typescript
await updateOperation(operationId, {
  currentStep: 'Browse Course Website',
  currentStepIndex: 2,
  activity: 'Extracting course information from website',
});
```

### 5. Operation Completion

When operation finishes:

```typescript
await updateOperation(operationId, {
  status: 'completed', // or 'failed'
  completedAt: new Date().toISOString(),
  duration: calculateDuration(startedAt, completedAt),
  disposition: {
    success: true,
    result: operationResult,
    // or on failure:
    // success: false,
    // error: errorMessage,
    // errorCode: 'ERROR_CODE',
  },
});
```

## API Endpoints

### GET `/api/operations`

Returns all operations, optionally filtered by status, type, or date range.

**Query Parameters:**
- `status`: Filter by status (pending, in_progress, completed, failed, cancelled)
- `type`: Filter by type (skill, tool_call, agent_task, etc.)
- `limit`: Maximum number of operations to return (default: 100)
- `since`: ISO timestamp - only return operations created after this time

**Response:**
```json
[
  {
    "id": "op_1",
    "type": "skill",
    "name": "Research Pebble Beach Golf Links",
    "status": "in_progress",
    "createdAt": "2026-01-29T10:00:00Z",
    "startedAt": "2026-01-29T10:00:00Z",
    "currentStep": "Browse Course Website",
    "currentStepIndex": 2,
    "activity": "Extracting course information from website",
    "steps": [...],
    "metrics": {
      "tokens": {...},
      "duration": 120000,
      "stepsCompleted": 2,
      "stepsTotal": 7,
      "progress": 28
    },
    ...
  }
]
```

### GET `/api/operations/:id`

Returns a single operation by ID.

### WebSocket: `/ws/operations?token=...`

Establishes a WebSocket connection for real-time operation updates.

**Connection:**
```javascript
const ws = new WebSocket('ws://127.0.0.1:18789/ws/operations?token=YOUR_TOKEN');
```

**Messages:**
The server sends operation updates as JSON:

```json
{
  "id": "op_1",
  "status": "in_progress",
  "currentStep": "Browse Course Website",
  "metrics": {
    "tokens": {
      "total": 1700
    },
    "progress": 42
  },
  ...
}
```

## Integration Points in Clawdbot

### Skill Execution Hook

Add operation tracking to skill execution:

```go
// When skill starts
operation := &Operation{
    Type: "skill",
    Name: fmt.Sprintf("Execute %s skill", skillName),
    SkillName: skillName,
    Status: "in_progress",
    CreatedAt: time.Now(),
    StartedAt: time.Now(),
    Steps: buildStepsFromSkill(skill),
}

operationID := createOperation(operation)
emitWebSocketUpdate(operation)

// During execution
for i, step := range operation.Steps {
    updateStep(operationID, step.ID, StepStatusRunning)
    emitWebSocketUpdate(operation)
    
    // Execute step...
    
    updateStep(operationID, step.ID, StepStatusCompleted)
    operation.Metrics.StepsCompleted++
    operation.Metrics.Progress = calculateProgress(operation)
    emitWebSocketUpdate(operation)
}

// On completion
operation.Status = "completed"
operation.CompletedAt = time.Now()
operation.Duration = time.Since(operation.StartedAt)
operation.Disposition = OperationDisposition{
    Success: true,
    Result: result,
}
updateOperation(operationID, operation)
emitWebSocketUpdate(operation)
```

### Token Tracking

Track tokens from LLM API calls:

```go
// After LLM API call
usage := response.Usage
operation.Metrics.Tokens = &TokenUsage{
    Prompt: usage.PromptTokens,
    Completion: usage.CompletionTokens,
    Total: usage.TotalTokens,
    Cost: calculateCost(usage.TotalTokens, model),
    Model: model,
}
updateOperationMetrics(operationID, operation.Metrics)
emitWebSocketUpdate(operation)
```

## Database Schema

Suggested schema for storing operations:

```sql
CREATE TABLE operations (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL,
    skill_name VARCHAR(100),
    agent_id VARCHAR(255),
    user_id VARCHAR(255),
    channel VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    current_step VARCHAR(255),
    current_step_index INTEGER,
    activity TEXT,
    metadata JSONB,
    tags TEXT[],
    disposition JSONB
);

CREATE TABLE operation_steps (
    id VARCHAR(255) PRIMARY KEY,
    operation_id VARCHAR(255) REFERENCES operations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error TEXT,
    metadata JSONB,
    sort_order INTEGER
);

CREATE TABLE operation_metrics (
    operation_id VARCHAR(255) PRIMARY KEY REFERENCES operations(id),
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    tokens_total INTEGER,
    tokens_cost DECIMAL(10, 6),
    tokens_model VARCHAR(100),
    steps_completed INTEGER DEFAULT 0,
    steps_total INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0
);
```

## WebSocket Implementation

Example WebSocket handler:

```go
func handleOperationsWebSocket(w http.ResponseWriter, r *http.Request) {
    token := r.URL.Query().Get("token")
    if !validateToken(token) {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }
    defer conn.Close()

    // Subscribe to operation updates
    updates := subscribeToOperationUpdates()
    defer unsubscribeFromOperationUpdates(updates)

    for {
        select {
        case operation := <-updates:
            if err := conn.WriteJSON(operation); err != nil {
                return
            }
        case <-time.After(30 * time.Second):
            // Send ping to keep connection alive
            if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

## Testing

Use the mock data in `operationService.ts` to test the UI without a backend:

1. The service automatically falls back to mock data if the API is unavailable
2. Mock operations simulate real operation lifecycle
3. WebSocket connection failures fall back to polling

## Next Steps

1. Implement operation tracking in Clawdbot gateway
2. Create database tables for operations
3. Add REST API endpoints
4. Implement WebSocket endpoint
5. Integrate tracking into skill execution
6. Deploy kanban board UI
