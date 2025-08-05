/**
 * ExecutionService - THE MAIN SERVICE for task execution
 */

import { UpdateService } from './UpdateService.js';
import { StatusService } from '../shared/StatusService.js';
import { ExecutionMode, ExecutionResult, ExecutionStep, ExecutionAction, ExecutionContext } from '../../models/Workflow.js';

export class ExecutionService {
  constructor(
    private updateService: UpdateService,
    private statusService: StatusService
  ) {
    // Set up circular dependency for execution service
    this.updateService.setExecutionService(this);
  }

  /**
   * Handle todos updated - return next action instead of throwing
   */
  async handleTodosUpdated(taskId: string): Promise<ExecutionAction | null> {
    try {
      const todoAnalysis = await this.updateService.analyzeTodos(taskId);
      const taskMetadata = await this.updateService.getTaskMetadata(taskId);
      
      return await this.analyzeAndPlanNext(taskId, taskMetadata, todoAnalysis);
    } catch (error) {
      console.warn('Auto-continuation analysis failed:', error);
      return null;
    }
  }

  /**
   * Execute task - returns action guidance instead of throwing errors
   */
  async executeTask(taskId: string, mode: ExecutionMode): Promise<ExecutionResult> {
    const progression: ExecutionStep[] = [];

    // Get initial task state
    const taskMetadata = await this.updateService.getTaskMetadata(taskId);
    const todoAnalysis = await this.updateService.analyzeTodos(taskId);
    
    progression.push({
      type: 'status_update',
      message: `Starting execution for: ${taskMetadata.title}`,
      completed: true,
      timestamp: new Date()
    });

    try {
      // Auto-update status to inProgress at start if enabled
      if (mode.autoUpdateStatus) {
        const notStartedStatus = this.statusService.getNotStartedStatus();
        if (taskMetadata.status === notStartedStatus) {
          // Always move to In Progress when starting execution
          const inProgressStatus = this.statusService.getNextRecommendedStatus(taskMetadata.status, 1);
          if (inProgressStatus) {
            await this.updateTaskStatusBasedOnProgress(taskId, 1);
            progression.push({
              type: 'status_update',
              message: `Task status updated to "${inProgressStatus}" (execution started)`,
              completed: true,
              timestamp: new Date()
            });
          }
        }
      }

      // Analyze and plan next action
      const nextAction = await this.analyzeAndPlanNext(taskId, taskMetadata, todoAnalysis);

      // Auto-update status if completed
      if (mode.autoUpdateStatus && nextAction.type === 'completed') {
        await this.updateTaskStatusBasedOnProgress(taskId, nextAction.stats.percentage);
        progression.push({
          type: 'status_update',
          message: 'Task status updated to "Done" (100% complete)',
          completed: true,
          timestamp: new Date()
        });
      }

      // Add development summary
      const devSummary = await this.updateService.generateDevSummary(taskId);
      progression.push({
        type: 'status_update',
        message: `\n${devSummary}`,
        completed: true,
        timestamp: new Date()
      });

      return {
        success: true,
        taskId,
        finalStats: todoAnalysis.stats,
        progression,
        nextAction,
        message: this.formatActionMessage(nextAction)
      };

    } catch (error) {
      progression.push({
        type: 'status_update',
        message: `Execution failed: ${error}`,
        completed: false,
        timestamp: new Date()
      });

      return {
        success: false,
        taskId,
        finalStats: taskMetadata.todoStats,
        progression,
        message: `Execution failed: ${error}`
      };
    }
  }

  /**
   * Provider-aware execution: Give full context and let AI do everything
   */
  private async analyzeAndPlanNext(taskId: string, taskMetadata: any, todoAnalysis: any): Promise<ExecutionAction> {
    const uncompletedTodos = todoAnalysis.todos.filter((todo: any) => !todo.completed);
    
    const context: ExecutionContext = {
      taskId,
      taskTitle: taskMetadata.title,
      todoStats: todoAnalysis.stats
    };

    // If no todos at all, guide AI to work from task description
    if (todoAnalysis.stats.total === 0) {
      return {
        type: 'needs_analysis',
        message: `Task "${taskMetadata.title}" has no structured todos but needs development work.`,
        context: {
          ...context,
          currentTodo: 'Analyze task and break down work'
        }
      };
    }

    // All todos completed
    if (uncompletedTodos.length === 0) {
      return {
        type: 'completed',
        message: 'All todos completed successfully!',
        stats: todoAnalysis.stats
      };
    }

    // PROVIDER-AWARE: Give full context and let AI implement everything at once
    return {
      type: 'needs_implementation',
      todo: 'Complete entire task',
      instructions: this.formatFullTaskInstructions(taskMetadata, todoAnalysis),
      context
    };
  }

  /**
   * Format full task with rich context for provider-aware execution
   */
  private formatFullTaskInstructions(taskMetadata: any, todoAnalysis: any): string {
    let instructions = `# ${taskMetadata.title}\n\n`;
    
    instructions += `## Task Overview\n`;
    instructions += `You need to implement this entire task. Use your development tools (Read, Edit, Write, Bash) to complete ALL requirements.\n\n`;
    
    // Group todos by heading with context
    const todosByHeading = this.groupTodosByHeading(todoAnalysis.todos);
    
    for (const [heading, todos] of Object.entries(todosByHeading)) {
      instructions += `## ${heading}\n`;
      
      // Add context if available
      const firstTodo = todos[0] as any;
      if (firstTodo.contextText) {
        instructions += `${firstTodo.contextText}\n\n`;
      }
      
      instructions += `Requirements:\n`;
      for (const todo of todos) {
        const status = (todo as any).completed ? '✅' : '❌';
        instructions += `- ${status} ${(todo as any).text.replace(/^.*?: /, '')}\n`;
      }
      instructions += `\n`;
    }
    
    instructions += `## Next Steps\n`;
    instructions += `1. Implement ALL requirements above using development tools\n`;
    instructions += `2. Test your implementation\n`;
    instructions += `3. VALIDATE each requirement is truly satisfied (read files, run tests, verify outputs)\n`;
    instructions += `4. Only use update_todos to mark todos as completed AFTER you have verified they are done\n`;
    instructions += `5. The system will generate a dev summary for final validation\n\n`;
    
    return instructions;
  }

  /**
   * Group todos by their heading for better organization
   */
  private groupTodosByHeading(todos: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const todo of todos) {
      const heading = todo.heading || 'General';
      if (!grouped[heading]) {
        grouped[heading] = [];
      }
      grouped[heading].push(todo);
    }
    
    return grouped;
  }


  /**
   * Format action message for ExecutionResult
   */
  private formatActionMessage(action: ExecutionAction): string {
    switch (action.type) {
      case 'completed':
        return action.message;
      case 'needs_implementation':
        return `Next todo: ${action.todo}`;
      case 'needs_analysis':
        return action.message;
      case 'continue':
        return action.message;
      default:
        return 'Ready to proceed';
    }
  }


  private async updateTaskStatusBasedOnProgress(taskId: string, percentage: number): Promise<void> {
    try {
      const taskMetadata = await this.updateService.getTaskMetadata(taskId); 
      const recommendedStatus = this.statusService.getNextRecommendedStatus(
        taskMetadata.status, 
        percentage
      );
      
      if (recommendedStatus && recommendedStatus !== taskMetadata.status) {
        await this.updateService.updateTask(taskId, { status: recommendedStatus });
      }
    } catch (error) {
      console.warn('Failed to auto-update task status:', error);
    }
  }

}