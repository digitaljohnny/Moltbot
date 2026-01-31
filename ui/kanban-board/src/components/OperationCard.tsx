import React, { useState } from 'react';
import { Operation, OperationStatus } from '../types/operation';
import './OperationCard.css';

interface OperationCardProps {
  operation: Operation;
  onClick?: (operation: Operation) => void;
}

const OperationCard: React.FC<OperationCardProps> = ({ operation, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatTokens = (tokens?: number): string => {
    if (!tokens) return '—';
    if (tokens < 1000) return `${tokens}`;
    return `${(tokens / 1000).toFixed(1)}k`;
  };

  const getStatusColor = (status: OperationStatus): string => {
    switch (status) {
      case 'pending': return '#94a3b8';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#94a3b8';
    }
  };

  const getProgressPercentage = (): number => {
    if (operation.steps.length === 0) return 0;
    const completed = operation.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / operation.steps.length) * 100);
  };

  const statusColor = getStatusColor(operation.status);
  const progress = getProgressPercentage();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger modal if clicking expand button
    if ((e.target as HTMLElement).closest('.operation-card-expand-btn')) {
      return;
    }
    onClick?.(operation);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Extract API calls from metadata or steps
  const getApiCalls = () => {
    const apiCalls: Array<{
      method?: string;
      url?: string;
      request?: any;
      response?: any;
      statusCode?: number;
      timestamp?: string;
    }> = [];

    // Check metadata for API calls
    if (operation.metadata?.apiCalls) {
      apiCalls.push(...(Array.isArray(operation.metadata.apiCalls) ? operation.metadata.apiCalls : [operation.metadata.apiCalls]));
    }

    // Check steps for API calls
    operation.steps.forEach(step => {
      if (step.metadata?.apiCall) {
        apiCalls.push(step.metadata.apiCall);
      }
      if (step.metadata?.apiCalls) {
        apiCalls.push(...(Array.isArray(step.metadata.apiCalls) ? step.metadata.apiCalls : [step.metadata.apiCalls]));
      }
    });

    // If no structured API calls, check for request/response in metadata
    if (apiCalls.length === 0 && operation.metadata) {
      if (operation.metadata.request || operation.metadata.response) {
        apiCalls.push({
          method: operation.metadata.method || 'GET',
          url: operation.metadata.url || operation.metadata.endpoint,
          request: operation.metadata.request,
          response: operation.metadata.response,
          statusCode: operation.metadata.statusCode,
          timestamp: operation.metadata.timestamp,
        });
      }
    }

    return apiCalls;
  };

  const apiCalls = getApiCalls();

  return (
    <div 
      className={`operation-card ${isExpanded ? 'operation-card-expanded' : ''}`}
      onClick={handleCardClick}
      style={{ borderLeftColor: statusColor }}
    >
      {/* Header */}
      <div className="operation-card-header">
        <div className="operation-card-title-row">
          <h3 className="operation-card-title">{operation.name}</h3>
          <div className="operation-card-header-right">
            {apiCalls.length > 0 && (
              <button
                className="operation-card-expand-btn"
                onClick={handleExpandToggle}
                title={isExpanded ? 'Collapse' : 'Expand to view API calls'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            <span 
              className="operation-card-status-badge"
              style={{ backgroundColor: statusColor }}
            >
              {operation.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        {operation.skillName && (
          <div className="operation-card-skill">
            🏌️ {operation.skillName}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {operation.status === 'in_progress' && (
        <div className="operation-card-progress">
          <div 
            className="operation-card-progress-bar"
            style={{ 
              width: `${progress}%`,
              backgroundColor: statusColor 
            }}
          />
          <span className="operation-card-progress-text">{progress}%</span>
        </div>
      )}

      {/* Current Step */}
      {operation.currentStep && operation.status === 'in_progress' && (
        <div className="operation-card-current-step">
          <span className="operation-card-step-label">Current Step:</span>
          <span className="operation-card-step-name">{operation.currentStep}</span>
        </div>
      )}

      {/* Activity */}
      {operation.activity && (
        <div className="operation-card-activity">
          <span className="operation-card-activity-icon">⚡</span>
          <span className="operation-card-activity-text">{operation.activity}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="operation-card-metrics">
        <div className="operation-card-metric">
          <span className="operation-card-metric-label">Duration</span>
          <span className="operation-card-metric-value">
            {formatDuration(operation.duration || operation.metrics.duration)}
          </span>
        </div>
        
        {operation.metrics.tokens && (
          <>
            <div className="operation-card-metric">
              <span className="operation-card-metric-label">Tokens</span>
              <span className="operation-card-metric-value">
                {formatTokens(operation.metrics.tokens.total)}
              </span>
            </div>
            {operation.metrics.tokens.cost && (
              <div className="operation-card-metric">
                <span className="operation-card-metric-label">Cost</span>
                <span className="operation-card-metric-value">
                  ${operation.metrics.tokens.cost.toFixed(4)}
                </span>
              </div>
            )}
          </>
        )}
        
        <div className="operation-card-metric">
          <span className="operation-card-metric-label">Steps</span>
          <span className="operation-card-metric-value">
            {operation.metrics.stepsCompleted}/{operation.metrics.stepsTotal}
          </span>
        </div>
      </div>

      {/* Steps Preview */}
      {operation.steps.length > 0 && (
        <div className="operation-card-steps">
          {operation.steps.slice(0, 3).map((step, idx) => (
            <div 
              key={step.id} 
              className={`operation-card-step ${step.status}`}
              title={step.description || step.name}
            >
              <span className="operation-card-step-icon">
                {step.status === 'completed' ? '✓' : 
                 step.status === 'running' ? '⟳' : 
                 step.status === 'failed' ? '✗' : '○'}
              </span>
              <span className="operation-card-step-name">{step.name}</span>
            </div>
          ))}
          {operation.steps.length > 3 && (
            <div className="operation-card-step-more">
              +{operation.steps.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {operation.disposition?.error && (
        <div className="operation-card-error">
          <span className="operation-card-error-icon">⚠️</span>
          <span className="operation-card-error-text">
            {operation.disposition.error}
          </span>
        </div>
      )}

      {/* Expanded API Calls Section */}
      {isExpanded && apiCalls.length > 0 && (
        <div className="operation-card-expanded-content">
          <h4 className="operation-card-api-title">API Calls ({apiCalls.length})</h4>
          {apiCalls.map((apiCall, idx) => (
            <div key={idx} className="operation-card-api-call">
              <div className="operation-card-api-header">
                <span className="operation-card-api-method">
                  {apiCall.method || 'REQUEST'}
                </span>
                {apiCall.url && (
                  <span className="operation-card-api-url">{apiCall.url}</span>
                )}
                {apiCall.statusCode && (
                  <span className={`operation-card-api-status operation-card-api-status-${Math.floor(apiCall.statusCode / 100)}xx`}>
                    {apiCall.statusCode}
                  </span>
                )}
              </div>
              
              {apiCall.request && (
                <div className="operation-card-api-section">
                  <div className="operation-card-api-section-title">Request</div>
                  <pre className="operation-card-api-json">
                    {typeof apiCall.request === 'string' 
                      ? apiCall.request 
                      : JSON.stringify(apiCall.request, null, 2)}
                  </pre>
                </div>
              )}
              
              {apiCall.response && (
                <div className="operation-card-api-section">
                  <div className="operation-card-api-section-title">Response</div>
                  <pre className="operation-card-api-json">
                    {typeof apiCall.response === 'string' 
                      ? apiCall.response 
                      : JSON.stringify(apiCall.response, null, 2)}
                  </pre>
                </div>
              )}
              
              {apiCall.timestamp && (
                <div className="operation-card-api-timestamp">
                  {new Date(apiCall.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="operation-card-footer">
        <span className="operation-card-time">
          {new Date(operation.createdAt).toLocaleTimeString()}
        </span>
        {operation.channel && (
          <span className="operation-card-channel">{operation.channel}</span>
        )}
      </div>
    </div>
  );
};

export default OperationCard;
