/**
 * Operations Page Component
 * 
 * This is a standalone page component that can be integrated into the Control UI.
 * Import this component and add it as a route in your router.
 */

import React from 'react';
import KanbanBoard from '../components/KanbanBoard';
import { useOperations } from '../hooks/useOperations';
import './OperationsPage.css';

interface OperationsPageProps {
  /** Optional custom title */
  title?: string;
  /** Auto-refresh interval in milliseconds (default: 5000) */
  refreshInterval?: number;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
}

const OperationsPage: React.FC<OperationsPageProps> = ({
  title = 'Operations Dashboard',
  refreshInterval = 5000,
  autoRefresh = true,
}) => {
  const { board, loading, error, refresh } = useOperations(autoRefresh, refreshInterval);

  if (loading && !board) {
    return (
      <div className="operations-page-loading">
        <div className="operations-page-spinner" />
        <p>Loading operations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="operations-page-error">
        <h2>Error Loading Operations</h2>
        <p>{error.message}</p>
        <button onClick={refresh} className="operations-page-retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="operations-page-empty">
        <h2>{title}</h2>
        <p>No operations are currently available.</p>
        <button onClick={refresh} className="operations-page-refresh-btn">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="operations-page">
      <div className="operations-page-header">
        <h1 className="operations-page-title">{title}</h1>
      </div>
      <KanbanBoard board={board} onRefresh={refresh} />
    </div>
  );
};

export default OperationsPage;
