/**
 * Operations Kanban Board - Standalone Component
 * 
 * This is a self-contained component that can be easily integrated
 * into any React application. It handles its own data fetching and state.
 * 
 * Usage:
 *   import OperationsKanbanBoard from './components/OperationsKanbanBoard';
 *   <OperationsKanbanBoard />
 */

import React from 'react';
import OperationsPage from '../pages/OperationsPage';

interface OperationsKanbanBoardProps {
  /** Optional custom title */
  title?: string;
  /** Auto-refresh interval in milliseconds (default: 5000) */
  refreshInterval?: number;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Custom className for styling */
  className?: string;
}

/**
 * Standalone Operations Kanban Board Component
 * 
 * This component can be dropped into any page or used as a route.
 * It's a wrapper around OperationsPage that provides a clean API.
 */
const OperationsKanbanBoard: React.FC<OperationsKanbanBoardProps> = ({
  title,
  refreshInterval,
  autoRefresh,
  className,
}) => {
  return (
    <div className={className}>
      <OperationsPage
        title={title}
        refreshInterval={refreshInterval}
        autoRefresh={autoRefresh}
      />
    </div>
  );
};

export default OperationsKanbanBoard;
