/**
 * ExecutionService - THE MAIN SERVICE for task execution
 */

import { UpdateService } from './UpdateService.js';
import { StatusService } from '../shared/StatusService.js';
import { ExecutionMode, ExecutionResult, ExecutionStep } from '../../models/Workflow.js';

export class ExecutionService {
  constructor(
    private updateService: UpdateService,
    private statusService: StatusService
  ) {
    // Set up auto-continuation callback
    this.updateService.setOnTodosUpdatedCallback(this.handleTodosUpdated.bind(this));
  }

  /**
   * Handle todos updated - auto-continue execution if there are remaining todos
   */
  private async handleTodosUpdated(taskId: string): Promise<void> {
    try {
      // Check if there are remaining todos to execute
      const todoAnalysis = await this.updateService.analyzeTodos(taskId);
      const uncompletedTodos = todoAnalysis.todos.filter((todo: any) => !todo.completed);
      
      if (uncompletedTodos.length > 0) {
        // Auto-trigger next execution round
        const mode = { type: 'auto' as const, showProgress: true, autoUpdateStatus: true };
        await this.executeTask(taskId, mode);
      }
    } catch (error) {
      // Auto-continuation failure is not critical - todo update still succeeded
      console.warn('Auto-continuation failed:', error);
    }
  }

  /**
   * Execute task - simplified single approach
   */
  async executeTask(taskId: string, mode: ExecutionMode): Promise<ExecutionResult> {
    const progression: ExecutionStep[] = [];

    // Get initial task state
    const taskMetadata = await this.updateService.getTaskMetadata(taskId);
    
    progression.push({
      type: 'status_update',
      message: `Starting execution`,
      completed: true,
      timestamp: new Date()
    });

    try {
      // Auto-update status to inProgress at start if enabled
      if (mode.autoUpdateStatus) {
        const initialAnalysis = await this.updateService.analyzeTodos(taskId);
        const notStartedStatus = this.statusService.getNotStartedStatus();
        if (initialAnalysis.stats.percentage > 0 && notStartedStatus && taskMetadata.status === notStartedStatus) {
          await this.updateTaskStatusBasedOnProgress(taskId, initialAnalysis.stats.percentage);
          progression.push({
            type: 'status_update',
            message: 'Task status updated to "In Progress" (work detected)',
            completed: true,
            timestamp: new Date()
          });
        }
      }

      const result = await this.executeInternal(taskId, mode, progression);

      // Auto-update status if enabled
      if (mode.autoUpdateStatus && result.finalStats.percentage >= 100) {
        await this.updateTaskStatusBasedOnProgress(taskId, result.finalStats.percentage);
        
        progression.push({
          type: 'status_update',
          message: 'Task status updated to "Done" (100% complete)',
          completed: true,
          timestamp: new Date()
        });
      }

      // Add development summary with testing todos
      const devSummary = await this.updateService.generateDevSummary(taskId);
      progression.push({
        type: 'status_update',
        message: `\n${devSummary}`,
        completed: true,
        timestamp: new Date()
      });

      result.progression = progression;
      return result;

    } catch (error) {
      progression.push({
        type: 'status_update',
        message: `Execution failed: ${error}`,
        completed: false,
        timestamp: new Date()
      });

      // Add dev summary even on error
      const devSummary = await this.updateService.generateDevSummary(taskId);
      progression.push({
        type: 'status_update',
        message: `\n${devSummary}`,
        completed: true,
        timestamp: new Date()
      });

      return {
        success: false,
        taskId,
        mode: mode.type,
        finalStats: taskMetadata.todoStats,
        progression,
        message: `Execution failed: ${error}`
      };
    }
  }

  /**
   * Internal execution - simplified single approach
   */
  private async executeInternal(taskId: string, mode: ExecutionMode, progression: ExecutionStep[]): Promise<ExecutionResult> {
    const todoAnalysis = await this.updateService.analyzeTodos(taskId);
    const taskMetadata = await this.updateService.getTaskMetadata(taskId);
    
    // Get all uncompleted todos
    const uncompletedTodos = todoAnalysis.todos.filter((todo: any) => !todo.completed);

    // If no todos at all, guide AI to work from task description
    if (todoAnalysis.stats.total === 0) {
      const error = new Error(`WORKFLOW_EXECUTION_REQUIRED: Task "${taskMetadata.title}" has no structured todos but needs development work.

Phase 1: Analyze task description and requirements
Phase 2: Break down work into implementation steps
Phase 3: Use development tools (Read, Edit, Write, Bash) to implement
Phase 4: Test and validate implementation
Phase 5: Move task to "Test" status when complete

Analyze the task description to understand what needs to be implemented, then use the available development tools to complete the work.`);

      throw error;
    }

    if (uncompletedTodos.length === 0) {
      return {
        success: true,
        taskId,
        mode: mode.type,
        finalStats: todoAnalysis.stats,
        message: 'No todos to complete'
      };
    }

    progression.push({
      type: 'status_update',
      message: `Following workflow to execute ${uncompletedTodos.length} todos for task: ${taskMetadata.title}`,
      completed: false,
      timestamp: new Date()
    });

    // Process the first uncompleted todo - AI must implement it
    const firstTodo = uncompletedTodos[0];
    if (!firstTodo) {
      throw new Error('No uncompleted todos found but uncompletedTodos array was not empty');
    }
    
    progression.push({
      type: 'todo',
      message: `Next todo to implement: ${firstTodo.text}`,
      todoText: firstTodo.text,
      completed: false,
      timestamp: new Date()
    });

    // Guide AI to implement this specific todo
    const error = new Error(`TODO_IMPLEMENTATION_REQUIRED: Please implement the following todo and then mark it as completed:

TODO: "${firstTodo.text}"

Implementation steps:
1. Analyze what this todo requires (read relevant files, understand context)
2. Use development tools (Read, Edit, Write, Bash) to implement the functionality
3. Test your implementation if possible
4. Once implementation is complete, use update_todos to mark this todo as completed
5. After marking completed, call execute_task again to proceed to the next todo

Current task context:
- Task: ${taskMetadata.title}
- Total todos: ${todoAnalysis.stats.total}
- Completed: ${todoAnalysis.stats.completed}
- Remaining: ${uncompletedTodos.length}

After implementing this todo, the system will automatically proceed to the next one.`);

    throw error;
  }


  /**
   * Generate execution summary based on git changes since last commit
   */
  private async generateExecutionSummary(_taskId: string): Promise<string | null> {
    try {
      // Get git status and changes
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check if there are any changes
      const { stdout: status } = await execAsync('git status --porcelain');
      if (!status.trim()) {
        return null; // No changes
      }

      // Get diff of changes
      const { stdout: diff } = await execAsync('git diff --name-status');
      const { stdout: diffCached } = await execAsync('git diff --cached --name-status');
      
      const allChanges = (diff + diffCached).trim();
      if (!allChanges) {
        return null;
      }

      // Parse changes
      const changes = allChanges.split('\n').filter(line => line.trim());
      const summary = {
        modified: changes.filter(line => line.startsWith('M')).length,
        added: changes.filter(line => line.startsWith('A')).length,
        deleted: changes.filter(line => line.startsWith('D')).length
      };

      let summaryText = `Changes detected:\n`;
      if (summary.added > 0) summaryText += `• ${summary.added} files added\n`;
      if (summary.modified > 0) summaryText += `• ${summary.modified} files modified\n`;
      if (summary.deleted > 0) summaryText += `• ${summary.deleted} files deleted\n`;
      
      summaryText += `\nNext steps:\n`;
      summaryText += `• Review changes with: git diff\n`;
      summaryText += `• Test implementation\n`;
      summaryText += `• Use update_todos to mark completed todos\n`;
      summaryText += `• Consider moving task to "Test" status when ready`;

      return summaryText;
    } catch (error) {
      return null; // Git command failed, skip summary
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