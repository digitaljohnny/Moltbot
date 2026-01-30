import React, { useState } from 'react';
import { KanbanBoard as KanbanBoardType, Operation } from '../types/operation';
import KanbanColumn from './KanbanColumn';
import OperationDetailModal from './OperationDetailModal';
import './KanbanBoard.css';

interface KanbanBoardProps {
  board: KanbanBoardType;
  onRefresh?: () => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ board, onRefresh }) => {
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);

  const handleOperationClick = (operation: Operation) => {
    setSelectedOperation(operation);
  };

  const handleCloseModal = () => {
    setSelectedOperation(null);
  };

  return (
    <div className="kanban-board-container">
      <div className="kanban-board-header">
        <div className="kanban-board-title-section">
          <h1 className="kanban-board-title">Operations Dashboard</h1>
          <span className="kanban-board-subtitle">
            Real-time observability for all operations
          </span>
        </div>
        <div className="kanban-board-actions">
          <button 
            className="kanban-board-refresh-btn"
            onClick={onRefresh}
            title="Refresh"
          >
            🔄 Refresh
          </button>
          <span className="kanban-board-last-updated">
            Updated: {new Date(board.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="kanban-board">
        {board.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onOperationClick={handleOperationClick}
          />
        ))}
      </div>

      {selectedOperation && (
        <OperationDetailModal
          operation={selectedOperation}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
