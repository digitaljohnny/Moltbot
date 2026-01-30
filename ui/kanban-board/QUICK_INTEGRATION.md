# Quick Integration Guide

## Fastest Integration Method

### 1. Copy Files to Control UI

```bash
# Assuming your Control UI is in a sibling directory or you know the path
CONTROL_UI_PATH="/path/to/your/control-ui"

# Copy components
cp -r ui/kanban-board/src/components/* $CONTROL_UI_PATH/src/components/operations/
cp -r ui/kanban-board/src/hooks/useOperations.ts $CONTROL_UI_PATH/src/hooks/
cp -r ui/kanban-board/src/services/operationService.ts $CONTROL_UI_PATH/src/services/
cp -r ui/kanban-board/src/types/operation.ts $CONTROL_UI_PATH/src/types/
cp ui/kanban-board/src/pages/OperationsPage.tsx $CONTROL_UI_PATH/src/pages/
```

### 2. Add Route (React Router Example)

```tsx
// In your router file (e.g., App.tsx or router.tsx)
import OperationsPage from './pages/OperationsPage';

// Add to your routes
<Route path="/operations" element={<OperationsPage />} />
```

### 3. Add Navigation Link

```tsx
// In your navigation component
import { Link } from 'react-router-dom';

<Link to="/operations">📊 Operations</Link>
```

### 4. Update API Configuration

Edit `src/services/operationService.ts` to match your Control UI's API setup:

```typescript
// Update these lines:
const API_BASE_URL = 'http://127.0.0.1:18789/api'; // Your API URL
const WS_BASE_URL = 'ws://127.0.0.1:18789'; // Your WebSocket URL

// Update getAuthToken() to use your auth mechanism
private getAuthToken(): string {
  // Use your Control UI's token storage
  return localStorage.getItem('clawdbot_token') || '';
}
```

### 5. Done!

Navigate to `/operations` in your Control UI to see the kanban board.

## Alternative: Use as Standalone Component

If you just want to embed it in an existing page:

```tsx
import OperationsKanbanBoard from './components/OperationsKanbanBoard';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <OperationsKanbanBoard />
    </div>
  );
}
```

## If Control UI is Not React-Based

### Option 1: Build and Serve Separately

```bash
cd ui/kanban-board
npm run build
```

Then serve the `build/` directory and embed as iframe:

```html
<iframe 
  src="http://localhost:3000" 
  width="100%" 
  height="800px"
  style="border: none;"
></iframe>
```

### Option 2: Create API Proxy Route

Have your Control UI gateway proxy requests:

```go
// In your gateway
router.GET("/operations-board", func(c *gin.Context) {
    // Serve the built kanban board HTML/JS
    c.File("./static/operations-board/index.html")
})
```

## Troubleshooting

**Styles not working?**
- Make sure CSS files are imported or included in your build

**API errors?**
- Check browser console for CORS/auth errors
- Verify API endpoints exist
- Ensure token is being passed

**Components not found?**
- Check import paths match your file structure
- Ensure TypeScript/JSX is configured correctly
