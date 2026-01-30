import { useState, useEffect, useCallback } from 'react';
import { Operation, KanbanBoard } from '../types/operation';
import { operationService } from '../services/operationService';

export const useOperations = (autoRefresh: boolean = true, refreshInterval: number = 5000) => {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const operations = await operationService.fetchOperations();
      const kanbanBoard = operationService.organizeIntoKanbanBoard(operations);
      setBoard(kanbanBoard);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch operations'));
      console.error('Error fetching operations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOperations();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOperations]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const cleanup = operationService.connectWebSocket(
      (updatedOperation: Operation) => {
        // Update the operation in the board
        setBoard((currentBoard) => {
          if (!currentBoard) return currentBoard;

          const updatedColumns = currentBoard.columns.map((column) => {
            const operationIndex = column.operations.findIndex(
              (op) => op.id === updatedOperation.id
            );

            if (operationIndex >= 0) {
              // Update existing operation
              const updatedOperations = [...column.operations];
              updatedOperations[operationIndex] = updatedOperation;

              // Check if status changed - move to appropriate column
              if (column.id !== updatedOperation.status) {
                // Remove from current column
                return {
                  ...column,
                  operations: column.operations.filter(
                    (op) => op.id !== updatedOperation.id
                  ),
                };
              }

              return {
                ...column,
                operations: updatedOperations,
              };
            }

            // If operation is new and belongs to this column
            if (column.id === updatedOperation.status) {
              return {
                ...column,
                operations: [updatedOperation, ...column.operations],
              };
            }

            return column;
          });

          // Reorganize to ensure operation is in correct column
          const reorganizedBoard = operationService.organizeIntoKanbanBoard(
            updatedColumns.flatMap((col) => col.operations)
          );

          return {
            ...reorganizedBoard,
            lastUpdated: new Date().toISOString(),
          };
        });
      },
      (wsError) => {
        console.error('WebSocket error:', wsError);
        // Fall back to polling if WebSocket fails
      }
    );

    return cleanup;
  }, []);

  return {
    board,
    loading,
    error,
    refresh: fetchOperations,
  };
};
