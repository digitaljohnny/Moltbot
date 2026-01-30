import React from 'react';
import { Operation } from '../types/operation';
import './OperationDetailModal.css';

interface OperationDetailModalProps {
  operation: Operation;
  onClose: () => void;
}

const OperationDetailModal: React.FC<OperationDetailModalProps> = ({ operation, onClose }) => {
  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatTimestamp = (ts?: string): string => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="operation-modal-overlay" onClick={onClose}>
      <div className="operation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="operation-modal-header">
          <h2 className="operation-modal-title">{operation.name}</h2>
          <button className="operation-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="operation-modal-content">
          {/* Status & Type */}
          <div className="operation-modal-section">
            <h3 className="operation-modal-section-title">Status</h3>
            <div className="operation-modal-grid">
              <div>
                <span className="operation-modal-label">Status:</span>
                <span className="operation-modal-value">{operation.status}</span>
              </div>
              <div>
                <span className="operation-modal-label">Type:</span>
                <span className="operation-modal-value">{operation.type}</span>
              </div>
              {operation.skillName && (
                <div>
                  <span className="operation-modal-label">Skill:</span>
                  <span className="operation-modal-value">{operation.skillName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timing */}
          <div className="operation-modal-section">
            <h3 className="operation-modal-section-title">Timing</h3>
            <div className="operation-modal-grid">
              <div>
                <span className="operation-modal-label">Created:</span>
                <span className="operation-modal-value">{formatTimestamp(operation.createdAt)}</span>
              </div>
              <div>
                <span className="operation-modal-label">Started:</span>
                <span className="operation-modal-value">{formatTimestamp(operation.startedAt)}</span>
              </div>
              <div>
                <span className="operation-modal-label">Completed:</span>
                <span className="operation-modal-value">{formatTimestamp(operation.completedAt)}</span>
              </div>
              <div>
                <span className="operation-modal-label">Duration:</span>
                <span className="operation-modal-value">
                  {formatDuration(operation.duration || operation.metrics.duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Token Usage */}
          {operation.metrics.tokens && (
            <div className="operation-modal-section">
              <h3 className="operation-modal-section-title">Token Usage</h3>
              <div className="operation-modal-grid">
                <div>
                  <span className="operation-modal-label">Prompt Tokens:</span>
                  <span className="operation-modal-value">
                    {operation.metrics.tokens.prompt.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="operation-modal-label">Completion Tokens:</span>
                  <span className="operation-modal-value">
                    {operation.metrics.tokens.completion.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="operation-modal-label">Total Tokens:</span>
                  <span className="operation-modal-value">
                    {operation.metrics.tokens.total.toLocaleString()}
                  </span>
                </div>
                {operation.metrics.tokens.cost && (
                  <div>
                    <span className="operation-modal-label">Estimated Cost:</span>
                    <span className="operation-modal-value">
                      ${operation.metrics.tokens.cost.toFixed(4)}
                    </span>
                  </div>
                )}
                {operation.metrics.tokens.model && (
                  <div>
                    <span className="operation-modal-label">Model:</span>
                    <span className="operation-modal-value">{operation.metrics.tokens.model}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="operation-modal-section">
            <h3 className="operation-modal-section-title">Progress</h3>
            <div className="operation-modal-progress-bar">
              <div 
                className="operation-modal-progress-fill"
                style={{ width: `${operation.metrics.progress}%` }}
              />
              <span className="operation-modal-progress-text">
                {operation.metrics.progress}% ({operation.metrics.stepsCompleted}/{operation.metrics.stepsTotal} steps)
              </span>
            </div>
          </div>

          {/* Steps */}
          {operation.steps.length > 0 && (
            <div className="operation-modal-section">
              <h3 className="operation-modal-section-title">Steps</h3>
              <div className="operation-modal-steps">
                {operation.steps.map((step, idx) => (
                  <div key={step.id} className={`operation-modal-step operation-modal-step-${step.status}`}>
                    <div className="operation-modal-step-header">
                      <span className="operation-modal-step-number">{idx + 1}</span>
                      <span className="operation-modal-step-name">{step.name}</span>
                      <span className="operation-modal-step-status">{step.status}</span>
                    </div>
                    {step.description && (
                      <div className="operation-modal-step-description">{step.description}</div>
                    )}
                    <div className="operation-modal-step-timing">
                      {step.startedAt && (
                        <span>Started: {formatTimestamp(step.startedAt)}</span>
                      )}
                      {step.completedAt && (
                        <span>Completed: {formatTimestamp(step.completedAt)}</span>
                      )}
                      {step.duration && (
                        <span>Duration: {formatDuration(step.duration)}</span>
                      )}
                    </div>
                    {step.error && (
                      <div className="operation-modal-step-error">
                        <strong>Error:</strong> {step.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Activity */}
          {operation.activity && (
            <div className="operation-modal-section">
              <h3 className="operation-modal-section-title">Current Activity</h3>
              <div className="operation-modal-activity">{operation.activity}</div>
            </div>
          )}

          {/* Disposition */}
          {operation.disposition && (
            <div className="operation-modal-section">
              <h3 className="operation-modal-section-title">Disposition</h3>
              <div className="operation-modal-grid">
                <div>
                  <span className="operation-modal-label">Success:</span>
                  <span className="operation-modal-value">
                    {operation.disposition.success ? 'Yes' : 'No'}
                  </span>
                </div>
                {operation.disposition.error && (
                  <div className="operation-modal-error-full">
                    <span className="operation-modal-label">Error:</span>
                    <span className="operation-modal-value">{operation.disposition.error}</span>
                  </div>
                )}
                {operation.disposition.warnings && operation.disposition.warnings.length > 0 && (
                  <div className="operation-modal-warnings">
                    <span className="operation-modal-label">Warnings:</span>
                    <ul>
                      {operation.disposition.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {operation.metadata && Object.keys(operation.metadata).length > 0 && (
            <div className="operation-modal-section">
              <h3 className="operation-modal-section-title">Metadata</h3>
              <pre className="operation-modal-json">
                {JSON.stringify(operation.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperationDetailModal;
