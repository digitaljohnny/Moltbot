# Clawdbot Operations Kanban Board

A real-time kanban board dashboard providing comprehensive observability for all Clawdbot operations, including skill executions, tool calls, and agent tasks.

**Ready for integration into the existing Moltbot Control UI!** See [QUICK_INTEGRATION.md](./QUICK_INTEGRATION.md) for the fastest integration path.

## Features

- **Real-time Updates**: WebSocket integration for live operation status updates
- **Comprehensive Metrics**: Track token consumption, duration, progress, and costs
- **Step-by-Step Progress**: Visual progress tracking through multi-step operations
- **Detailed Views**: Click any operation card to see full details
- **Status Tracking**: Operations organized by status (Pending, In Progress, Completed, Failed, Cancelled)
- **Activity Monitoring**: See current activity and step information for running operations

## What It Tracks

For each operation, the kanban board displays:

- **Status**: Current operation status
- **Progress**: Percentage complete and steps completed/total
- **Current Step**: Which step is currently executing
- **Activity**: What the operation is currently doing
- **Token Consumption**: Prompt, completion, and total tokens used
- **Cost**: Estimated cost based on token usage
- **Duration**: How long the operation has been running
- **Steps**: Detailed breakdown of all steps with timing
- **Disposition**: Success/failure status, errors, warnings, and results

## Installation

```bash
cd ui/kanban-board
npm install
```

## Development

```bash
npm start
```

The app will run on `http://localhost:3000` (or next available port).

## Configuration

Set environment variables in `.env`:

```env
REACT_APP_API_URL=http://127.0.0.1:18789/api
REACT_APP_WS_URL=ws://127.0.0.1:18789/ws/operations
REACT_APP_AUTH_TOKEN=your-token-here
```

Or pass the token via URL parameter:
```
http://localhost:3000/?token=your-token-here
```

## Building for Production

```bash
npm run build
```

The built files will be in the `build/` directory, ready to be served by your web server or integrated into the Clawdbot Control UI.

## Integration into Control UI

### Quick Integration (5 minutes)

See [QUICK_INTEGRATION.md](./QUICK_INTEGRATION.md) for the fastest way to add this to your Control UI.

### Full Integration Guide

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed integration instructions, including:
- Copying components into your Control UI
- Adding routes and navigation
- Configuring API endpoints
- Styling customization
- Troubleshooting

### Integration Examples

See [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md) for examples with:
- React Router
- Next.js
- Vue.js
- Angular
- Vanilla JavaScript
- Embedded components

## Integration with Clawdbot Gateway

### API Endpoints Required

The kanban board expects the following API endpoints:

#### GET `/api/operations`
Returns a list of all operations:
```json
[
  {
    "id": "op_1",
    "type": "skill",
    "name": "Research Pebble Beach Golf Links",
    "status": "in_progress",
    ...
  }
]
```

#### GET `/api/operations/:id`
Returns a single operation by ID.

#### WebSocket: `ws://127.0.0.1:18789/ws/operations?token=...`
Streams operation updates in real-time. Each message is a JSON-serialized `Operation` object.

### Operation Tracking Implementation

To track operations in Clawdbot, you'll need to:

1. **Create operation records** when operations start
2. **Update operation status** as operations progress through steps
3. **Track token usage** from LLM API responses
4. **Calculate duration** from start to completion
5. **Emit WebSocket events** when operations update

Example integration point in skill execution:

```typescript
// When skill starts
const operation = await createOperation({
  type: 'skill',
  name: 'Research Pebble Beach Golf Links',
  skillName: 'golf-course-research',
  status: 'in_progress',
  steps: [
    { id: 'step_1', name: 'Locate Course', status: 'pending' },
    { id: 'step_2', name: 'Gather Info', status: 'pending' },
    // ...
  ],
});

// When step completes
await updateOperationStep(operation.id, 'step_1', {
  status: 'completed',
  completedAt: new Date().toISOString(),
});

// Track token usage
await updateOperationMetrics(operation.id, {
  tokens: {
    prompt: 1250,
    completion: 450,
    total: 1700,
    cost: 0.0034,
    model: 'openai/gpt-5.2',
  },
});

// When operation completes
await updateOperation(operation.id, {
  status: 'completed',
  completedAt: new Date().toISOString(),
  disposition: {
    success: true,
    result: { courseId: 'course_pebble_beach_ca' },
  },
});
```

## Mock Data

The kanban board includes mock data for development/testing when the API is not available. This allows you to develop and test the UI without a running Clawdbot gateway.

## Architecture

- **React + TypeScript**: Modern UI framework with type safety
- **WebSocket**: Real-time updates via WebSocket connection
- **Polling Fallback**: Automatic fallback to polling if WebSocket fails
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

```
ui/kanban-board/
├── src/
│   ├── components/
│   │   ├── KanbanBoard.tsx       # Main board container
│   │   ├── KanbanColumn.tsx       # Column component
│   │   ├── OperationCard.tsx      # Operation card component
│   │   └── OperationDetailModal.tsx # Detail view modal
│   ├── hooks/
│   │   └── useOperations.ts      # Operations data hook
│   ├── services/
│   │   └── operationService.ts   # API service
│   ├── types/
│   │   └── operation.ts          # TypeScript types
│   ├── App.tsx                   # Main app component
│   └── index.tsx                 # Entry point
├── public/
│   └── index.html
├── package.json
└── README.md
```

## Future Enhancements

- Filtering and search
- Operation history/archival
- Export operation data
- Customizable columns
- Operation grouping/tags
- Performance analytics
- Cost tracking over time
