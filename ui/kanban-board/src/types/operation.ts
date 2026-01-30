/**
 * Operation tracking types for the kanban board observability system
 */

export type OperationStatus = 
  | 'pending'      // Queued but not started
  | 'in_progress'  // Currently executing
  | 'completed'    // Successfully finished
  | 'failed'       // Failed with error
  | 'cancelled';   // User cancelled

export type OperationType = 
  | 'skill'        // Skill execution (e.g., golf-course-research)
  | 'tool_call'    // Individual tool call
  | 'agent_task'   // Agent task/request
  | 'webhook'      // Webhook execution
  | 'scheduled';   // Scheduled job

export type StepStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface OperationStep {
  id: string;
  name: string;
  description?: string;
  status: StepStatus;
  startedAt?: string;      // ISO 8601 timestamp
  completedAt?: string;     // ISO 8601 timestamp
  duration?: number;        // milliseconds
  error?: string;
  metadata?: Record<string, any>;
}

export interface TokenUsage {
  prompt: number;           // Tokens used in prompt
  completion: number;       // Tokens used in completion
  total: number;            // Total tokens
  cost?: number;            // Estimated cost in USD
  model?: string;           // Model used (e.g., "openai/gpt-5.2")
}

export interface OperationMetrics {
  tokens?: TokenUsage;
  duration: number;         // Total duration in milliseconds
  stepsCompleted: number;
  stepsTotal: number;
  progress: number;         // 0-100 percentage
}

export interface OperationDisposition {
  success: boolean;
  error?: string;
  errorCode?: string;
  warnings?: string[];
  result?: any;             // Operation result/output
  metadata?: Record<string, any>;
}

export interface Operation {
  id: string;               // Unique operation ID
  type: OperationType;
  name: string;             // Human-readable name
  description?: string;
  status: OperationStatus;
  
  // Timing
  createdAt: string;        // ISO 8601 timestamp
  startedAt?: string;       // ISO 8601 timestamp
  completedAt?: string;     // ISO 8601 timestamp
  duration?: number;        // milliseconds (calculated)
  
  // Progress tracking
  currentStep?: string;     // Current step name/ID
  currentStepIndex?: number;
  steps: OperationStep[];
  metrics: OperationMetrics;
  
  // Context
  skillName?: string;       // If type is 'skill'
  agentId?: string;
  userId?: string;
  channel?: string;         // e.g., "telegram", "webchat"
  
  // Activity/status details
  activity?: string;        // Current activity description
  disposition?: OperationDisposition;
  
  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface KanbanColumn {
  id: OperationStatus;
  title: string;
  operations: Operation[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  lastUpdated: string;     // ISO 8601 timestamp
}
