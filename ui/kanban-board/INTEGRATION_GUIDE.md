# Integrating Kanban Board into Existing Moltbot Control UI

This guide shows how to integrate the operations kanban board into the existing Moltbot Control UI.

## Integration Options

### Option 1: Standalone Route (Recommended)

Add the kanban board as a new route/page in the Control UI.

#### If Control UI uses React Router:

```tsx
// In your main router file
import { Routes, Route } from 'react-router-dom';
import OperationsKanbanBoard from './components/OperationsKanbanBoard';

// Add route
<Routes>
  {/* ... existing routes ... */}
  <Route path="/operations" element={<OperationsKanbanBoard />} />
</Routes>
```

#### Navigation Link:

Add to your navigation menu:
```tsx
<NavLink to="/operations">
  📊 Operations Dashboard
</NavLink>
```

### Option 2: Embed as Component

Import and use the kanban board as a component within an existing page.

```tsx
import KanbanBoard from './kanban-board/src/components/KanbanBoard';
import { useOperations } from './kanban-board/src/hooks/useOperations';

function DashboardPage() {
  const { board, loading, error, refresh } = useOperations();
  
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Other dashboard content */}
      
      <section>
        <h2>Operations</h2>
        {board && <KanbanBoard board={board} onRefresh={refresh} />}
      </section>
    </div>
  );
}
```

### Option 3: Iframe Embed (Fallback)

If the Control UI is not React-based, embed as an iframe:

```html
<!-- In your Control UI HTML -->
<iframe 
  src="http://127.0.0.1:18789/operations-board?token=YOUR_TOKEN"
  width="100%" 
  height="800px"
  frameborder="0"
  style="border: none;"
></iframe>
```

## File Structure for Integration

Move the kanban board components into your Control UI structure:

```
control-ui/
├── src/
│   ├── components/
│   │   ├── operations/              # Kanban board components
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── OperationCard.tsx
│   │   │   └── OperationDetailModal.tsx
│   │   └── ... (existing components)
│   ├── hooks/
│   │   ├── useOperations.ts
│   │   └── ... (existing hooks)
│   ├── services/
│   │   ├── operationService.ts
│   │   └── ... (existing services)
│   ├── types/
│   │   ├── operation.ts
│   │   └── ... (existing types)
│   └── pages/
│       ├── OperationsPage.tsx       # New page
│       └── ... (existing pages)
```

## Step-by-Step Integration

### 1. Copy Components

Copy the kanban board components into your Control UI:

```bash
# From the kanban-board directory
cp -r src/components/* /path/to/control-ui/src/components/operations/
cp -r src/hooks/useOperations.ts /path/to/control-ui/src/hooks/
cp -r src/services/operationService.ts /path/to/control-ui/src/services/
cp -r src/types/operation.ts /path/to/control-ui/src/types/
```

### 2. Copy Styles

Copy CSS files and ensure they're imported:

```bash
cp src/components/*.css /path/to/control-ui/src/components/operations/
```

### 3. Create Operations Page

Create a new page component:

```tsx
// src/pages/OperationsPage.tsx
import React from 'react';
import KanbanBoard from '../components/operations/KanbanBoard';
import { useOperations } from '../hooks/useOperations';
import './OperationsPage.css';

const OperationsPage: React.FC = () => {
  const { board, loading, error, refresh } = useOperations(true, 5000);

  if (loading && !board) {
    return (
      <div className="operations-loading">
        <div className="spinner" />
        <p>Loading operations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="operations-error">
        <h2>Error Loading Operations</h2>
        <p>{error.message}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="operations-empty">
        <p>No operations found</p>
      </div>
    );
  }

  return (
    <div className="operations-page">
      <KanbanBoard board={board} onRefresh={refresh} />
    </div>
  );
};

export default OperationsPage;
```

### 4. Update Service Configuration

Update `operationService.ts` to use your Control UI's API configuration:

```typescript
// Get base URL from your existing config
const API_BASE_URL = window.CONTROL_UI_CONFIG?.apiUrl || 'http://127.0.0.1:18789/api';
const WS_BASE_URL = window.CONTROL_UI_CONFIG?.wsUrl || 'ws://127.0.0.1:18789';

// Use existing auth token from Control UI
private getAuthToken(): string {
  // Use your Control UI's auth mechanism
  return window.CONTROL_UI_CONFIG?.token || 
         localStorage.getItem('clawdbot_token') || 
         '';
}
```

### 5. Add Route

Add the route to your router configuration:

```tsx
// src/App.tsx or src/router.tsx
import OperationsPage from './pages/OperationsPage';

// In your routes:
<Route path="/operations" element={<OperationsPage />} />
```

### 6. Add Navigation

Add a link in your navigation menu:

```tsx
// In your navigation component
<nav>
  {/* ... existing nav items ... */}
  <Link to="/operations">
    <span className="nav-icon">📊</span>
    Operations
  </Link>
</nav>
```

## Styling Integration

### Option A: Use Existing Styles

If your Control UI has a design system, adapt the kanban board styles:

```css
/* Override kanban board styles to match Control UI theme */
.kanban-board-container {
  background: var(--control-ui-bg-color);
  color: var(--control-ui-text-color);
}

.operation-card {
  background: var(--control-ui-card-bg);
  border-color: var(--control-ui-border-color);
}
```

### Option B: Namespace Styles

Prefix all kanban board CSS classes to avoid conflicts:

```css
/* Rename .kanban-board to .moltbot-kanban-board */
.moltbot-kanban-board-container { /* ... */ }
.moltbot-operation-card { /* ... */ }
```

## API Integration

The kanban board expects these endpoints. Ensure your gateway provides them:

### Required Endpoints

1. **GET `/api/operations`**
   - Returns list of all operations
   - Query params: `status`, `type`, `limit`, `since`

2. **GET `/api/operations/:id`**
   - Returns single operation details

3. **WebSocket `/ws/operations?token=...`**
   - Streams real-time operation updates

### Gateway Implementation

If these endpoints don't exist yet, you'll need to add them to the Clawdbot gateway. See `INTEGRATION.md` for backend implementation details.

## Testing Integration

1. **Start Control UI**:
   ```bash
   npm start
   # or however you start your Control UI
   ```

2. **Navigate to Operations**:
   - Go to `http://127.0.0.1:18789/operations`
   - Or click the "Operations" link in navigation

3. **Verify**:
   - Kanban board loads
   - Operations display correctly
   - Real-time updates work (if WebSocket is implemented)
   - Styling matches Control UI theme

## Troubleshooting

### Styles Not Loading

Ensure CSS files are imported:
```tsx
import './components/operations/KanbanBoard.css';
import './components/operations/OperationCard.css';
// etc.
```

### API Errors

Check browser console for CORS or authentication errors. Ensure:
- API endpoints are accessible
- Auth token is being passed correctly
- CORS is configured on gateway

### WebSocket Not Connecting

- Check WebSocket URL is correct
- Verify token is valid
- Check gateway WebSocket endpoint exists
- Fallback to polling will occur automatically

## Customization

### Customize Columns

Modify the column configuration in `operationService.ts`:

```typescript
organizeIntoKanbanBoard(operations: Operation[]): KanbanBoard {
  // Customize columns
  return {
    columns: [
      { id: 'pending', title: 'Queued', operations: [...] },
      { id: 'in_progress', title: 'Running', operations: [...] },
      // Add custom columns
    ],
    lastUpdated: new Date().toISOString(),
  };
}
```

### Add Filters

Add filtering UI to the kanban board:

```tsx
<KanbanBoard 
  board={board} 
  onRefresh={refresh}
  filters={{
    type: selectedType,
    dateRange: selectedDateRange,
  }}
/>
```

## Next Steps

1. Copy components into Control UI
2. Add route and navigation
3. Configure API endpoints
4. Test integration
5. Customize styling to match Control UI theme
6. Implement backend operation tracking (see `INTEGRATION.md`)
