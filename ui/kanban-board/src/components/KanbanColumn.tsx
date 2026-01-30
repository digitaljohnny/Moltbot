import React from 'react';
import { KanbanColumn as KanbanColumnType, Operation } from '../types/operation';
import OperationCard from './OperationCard';
import './KanbanColumn.css';

interface KanbanColumnProps {
  column: KanbanColumnType;
  onOperationClick?: (operation: Operation) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, onOperationClick }) => {
  const getColumnIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '📋';
    }
  };

  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <span className="kanban-column-icon">{getColumnIcon(column.id)}</span>
        <h2 className="kanban-column-title">{column.title}</h2>
        <span className="kanban-column-count">{column.operations.length}</span>
      </div>
      <div className="kanban-column-content">
        {column.operations.length === 0 ? (
          <div className="kanban-column-empty">
            No operations in this column
          </div>
        ) : (
          column.operations.map((operation) => (
            <OperationCard
              key={operation.id}
              operation={operation}
              onClick={onOperationClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
