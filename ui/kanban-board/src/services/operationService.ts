import { Operation, KanbanBoard, OperationStatus } from '../types/operation';

/**
 * Service for fetching and managing operations
 * This can be adapted to connect to your actual Clawdbot gateway API
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:18789/api';

export class OperationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Fetch all operations from the API
   */
  async fetchOperations(): Promise<Operation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/operations`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch operations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching operations:', error);
      // Return mock data for development
      return this.getMockOperations();
    }
  }

  /**
   * Fetch a single operation by ID
   */
  async fetchOperation(id: string): Promise<Operation> {
    try {
      const response = await fetch(`${API_BASE_URL}/operations/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch operation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching operation:', error);
      throw error;
    }
  }

  /**
   * Organize operations into kanban board columns
   */
  organizeIntoKanbanBoard(operations: Operation[]): KanbanBoard {
    const columns: Record<OperationStatus, Operation[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      failed: [],
      cancelled: [],
    };

    operations.forEach((op) => {
      columns[op.status].push(op);
    });

    // Sort operations by creation time (newest first)
    Object.values(columns).forEach((ops) => {
      ops.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return {
      columns: [
        { id: 'pending', title: 'Pending', operations: columns.pending },
        { id: 'in_progress', title: 'In Progress', operations: columns.in_progress },
        { id: 'completed', title: 'Completed', operations: columns.completed },
        { id: 'failed', title: 'Failed', operations: columns.failed },
        { id: 'cancelled', title: 'Cancelled', operations: columns.cancelled },
      ],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(
    onUpdate: (operation: Operation) => void,
    onError?: (error: Event) => void
  ): () => void {
    const wsUrl = process.env.REACT_APP_WS_URL || 
      `ws://127.0.0.1:18789/ws/operations?token=${this.getAuthToken()}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const operation: Operation = JSON.parse(event.data);
        onUpdate(operation);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(onUpdate, onError);
    };

    // Return cleanup function
    return () => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  private attemptReconnect(
    onUpdate: (operation: Operation) => void,
    onError?: (error: Event) => void
  ) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connectWebSocket(onUpdate, onError);
      }, delay);
    }
  }

  private getAuthToken(): string {
    // Get token from URL params, localStorage, or environment
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token') || 
           localStorage.getItem('clawdbot_token') || 
           process.env.REACT_APP_AUTH_TOKEN || 
           '';
  }

  /**
   * Mock operations for development/testing
   */
  private getMockOperations(): Operation[] {
    const now = new Date();
    return [
      {
        id: 'op_1',
        type: 'skill',
        name: 'Research Pebble Beach Golf Links',
        description: 'Golf course research operation',
        status: 'in_progress',
        createdAt: new Date(now.getTime() - 120000).toISOString(),
        startedAt: new Date(now.getTime() - 120000).toISOString(),
        duration: 120000,
        currentStep: 'Browse Course Website',
        currentStepIndex: 2,
        skillName: 'golf-course-research',
        activity: 'Extracting course information from website',
        steps: [
          {
            id: 'step_1',
            name: 'Locate Course (Google Places)',
            status: 'completed',
            startedAt: new Date(now.getTime() - 120000).toISOString(),
            completedAt: new Date(now.getTime() - 100000).toISOString(),
            duration: 20000,
          },
          {
            id: 'step_2',
            name: 'Gather Core Information',
            status: 'completed',
            startedAt: new Date(now.getTime() - 100000).toISOString(),
            completedAt: new Date(now.getTime() - 60000).toISOString(),
            duration: 40000,
          },
          {
            id: 'step_3',
            name: 'Browse Course Website',
            status: 'running',
            startedAt: new Date(now.getTime() - 60000).toISOString(),
          },
          {
            id: 'step_4',
            name: 'Research Course Design',
            status: 'pending',
          },
          {
            id: 'step_5',
            name: 'Determine Course Types',
            status: 'pending',
          },
          {
            id: 'step_6',
            name: 'Gather Additional Details',
            status: 'pending',
          },
          {
            id: 'step_7',
            name: 'Verify and Structure Data',
            status: 'pending',
          },
        ],
        metrics: {
          tokens: {
            prompt: 1250,
            completion: 450,
            total: 1700,
            cost: 0.0034,
            model: 'openai/gpt-5.2',
          },
          duration: 120000,
          stepsCompleted: 2,
          stepsTotal: 7,
          progress: 28,
        },
        channel: 'webchat',
      },
      {
        id: 'op_2',
        type: 'skill',
        name: 'Research Augusta National',
        status: 'completed',
        createdAt: new Date(now.getTime() - 300000).toISOString(),
        startedAt: new Date(now.getTime() - 300000).toISOString(),
        completedAt: new Date(now.getTime() - 180000).toISOString(),
        duration: 120000,
        skillName: 'golf-course-research',
        steps: [
          { id: 's1', name: 'Locate Course', status: 'completed' },
          { id: 's2', name: 'Gather Info', status: 'completed' },
          { id: 's3', name: 'Browse Website', status: 'completed' },
          { id: 's4', name: 'Research Design', status: 'completed' },
          { id: 's5', name: 'Classify Types', status: 'completed' },
          { id: 's6', name: 'Gather Details', status: 'completed' },
          { id: 's7', name: 'Verify Data', status: 'completed' },
        ],
        metrics: {
          tokens: {
            prompt: 2100,
            completion: 890,
            total: 2990,
            cost: 0.0059,
            model: 'openai/gpt-5.2',
          },
          duration: 120000,
          stepsCompleted: 7,
          stepsTotal: 7,
          progress: 100,
        },
        disposition: {
          success: true,
          result: { courseId: 'course_augusta_ga' },
        },
        channel: 'telegram',
      },
      {
        id: 'op_3',
        type: 'tool_call',
        name: 'Google Places Search',
        status: 'completed',
        createdAt: new Date(now.getTime() - 60000).toISOString(),
        startedAt: new Date(now.getTime() - 60000).toISOString(),
        completedAt: new Date(now.getTime() - 55000).toISOString(),
        duration: 5000,
        steps: [
          { id: 't1', name: 'Execute Search', status: 'completed' },
        ],
        metrics: {
          duration: 5000,
          stepsCompleted: 1,
          stepsTotal: 1,
          progress: 100,
        },
        disposition: {
          success: true,
        },
      },
    ];
  }
}

export const operationService = new OperationService();
