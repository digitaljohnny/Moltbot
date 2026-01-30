# Integration Examples

Examples of how to integrate the kanban board into different UI frameworks.

## React Router (Most Common)

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import OperationsPage from './pages/OperationsPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/operations">Operations</Link>
      </nav>
      
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/operations" element={<OperationsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Next.js

```tsx
// pages/operations.tsx
import OperationsPage from '../components/operations/OperationsPage';

export default function Operations() {
  return <OperationsPage />;
}
```

```tsx
// components/Navigation.tsx
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/operations">Operations</Link>
    </nav>
  );
}
```

## Vue.js (Using React in Vue)

If your Control UI is Vue-based, you can use `@vue/react` or embed as iframe:

```vue
<template>
  <div>
    <iframe 
      src="http://localhost:3000" 
      width="100%" 
      height="800px"
      style="border: none;"
    />
  </div>
</template>
```

## Angular

```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationsComponent } from './operations/operations.component';

const routes: Routes = [
  { path: 'operations', component: OperationsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

```typescript
// operations/operations.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-operations',
  template: '<div id="operations-root"></div>',
})
export class OperationsComponent implements OnInit {
  ngOnInit() {
    // Mount React app
    import('./operations-mount').then(m => m.mountOperations());
  }
}
```

## Vanilla JavaScript / HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>Control UI</title>
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/operations.html">Operations</a>
  </nav>
  
  <!-- Embed kanban board -->
  <iframe 
    src="http://localhost:3000" 
    width="100%" 
    height="800px"
    style="border: none;"
  ></iframe>
</body>
</html>
```

## Embedded in Existing Page

```tsx
// src/pages/Dashboard.tsx
import OperationsKanbanBoard from '../components/OperationsKanbanBoard';

function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <section className="dashboard-section">
        <h2>Recent Operations</h2>
        <OperationsKanbanBoard 
          title="Recent Operations"
          refreshInterval={10000}
        />
      </section>
      
      {/* Other dashboard content */}
    </div>
  );
}
```

## With Custom Styling

```tsx
// src/pages/Operations.tsx
import OperationsPage from '../components/operations/OperationsPage';
import './Operations.css';

function Operations() {
  return (
    <div className="custom-operations-wrapper">
      <OperationsPage />
    </div>
  );
}
```

```css
/* Operations.css */
.custom-operations-wrapper {
  /* Override kanban board styles */
}

.custom-operations-wrapper .operation-card {
  /* Custom card styling */
}
```

## With Authentication

```tsx
// src/pages/Operations.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OperationsPage from '../components/operations/OperationsPage';
import { useAuth } from '../hooks/useAuth';

function Operations() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <OperationsPage />;
}
```

## With Error Boundary

```tsx
// src/components/OperationsErrorBoundary.tsx
import React from 'react';
import OperationsPage from '../pages/OperationsPage';

class OperationsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong with the Operations dashboard.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<OperationsErrorBoundary>
  <OperationsPage />
</OperationsErrorBoundary>
```

## With Redux/State Management

```tsx
// src/store/operationsSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const operationsSlice = createSlice({
  name: 'operations',
  initialState: { operations: [] },
  reducers: {
    setOperations: (state, action) => {
      state.operations = action.payload;
    },
  },
});

export const { setOperations } = operationsSlice.actions;
export default operationsSlice.reducer;
```

```tsx
// src/pages/Operations.tsx
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import OperationsPage from '../components/operations/OperationsPage';
import { useOperations } from '../hooks/useOperations';
import { setOperations } from '../store/operationsSlice';

function Operations() {
  const dispatch = useDispatch();
  const { board } = useOperations();
  
  useEffect(() => {
    if (board) {
      const allOperations = board.columns.flatMap(col => col.operations);
      dispatch(setOperations(allOperations));
    }
  }, [board, dispatch]);
  
  return <OperationsPage />;
}
```
