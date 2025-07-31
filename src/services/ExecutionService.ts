/**
 * ExecutionService - THE MAIN SERVICE for task execution
 */

import { TaskService } from './TaskService.js';
import { TodoService } from './TodoService.js';
import { WorkflowService } from './WorkflowService.js';
import { ExecutionMode, ExecutionResult, ExecutionStep } from '../models/Workflow.js';
import { TodoHierarchy, TodoSection, TodoUpdateRequest } from '../models/Todo.js';

export class ExecutionService {
  constructor(
    private taskService: TaskService,
    private todoService: TodoService,
    private workflowService: WorkflowService
  ) {}

  /**
   * THE MAIN METHOD - Execute task with different modes
   */
  async executeTask(taskId: string, mode: ExecutionMode): Promise<ExecutionResult> {
    const startTime = new Date();
    const progression: ExecutionStep[] = [];

    // Get initial task state
    const taskMetadata = await this.taskService.getTaskMetadata(taskId);
    
    progression.push({
      type: 'status_update',
      message: `Starting execution in ${mode.type} mode`,
      completed: true,
      timestamp: new Date()
    });

    try {
      let result: ExecutionResult;

      switch (mode.type) {
        case 'auto':
          result = await this.executeAuto(taskId, mode, progression);
          break;
        case 'step':
          result = await this.executeStep(taskId, mode, progression);
          break;
        case 'batch':
          result = await this.executeBatch(taskId, mode, progression);
          break;
        default:
          throw new Error(`Unknown execution mode: ${mode.type}`);
      }

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

      result.progression = progression;
      return result;

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
        mode: mode.type,
        finalStats: taskMetadata.todoStats,
        progression,
        message: `Execution failed: ${error}`
      };
    }
  }

  /**
   * Auto mode - Execute all todos following workflow phases
   */
  private async executeAuto(taskId: string, mode: ExecutionMode, progression: ExecutionStep[]): Promise<ExecutionResult> {
    const todoAnalysis = await this.todoService.analyzeTodos(taskId);
    const taskMetadata = await this.taskService.getTaskMetadata(taskId);
    
    // Get all uncompleted todos
    const uncompletedTodos = todoAnalysis.todos.filter(todo => !todo.completed);

    if (uncompletedTodos.length === 0) {
      return {
        success: false,
        taskId,
        mode: 'auto',
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

    // Here's where the magic happens: We FAIL with a helpful message
    // This tells the AI system to take over and do the real work
    const error = new Error(`WORKFLOW_EXECUTION_REQUIRED: Task "${taskMetadata.title}" needs real development work. 

Phase 1: Understand the task and todos
Phase 2: For each todo, use development tools (Read, Edit, Write, Bash) to implement the work
Phase 3: Test and validate the implementation  
Phase 4: Mark todos as completed only after real work is done

Current todos to implement:
${uncompletedTodos.map(todo => `- ${todo.text}`).join('\n')}

Use the available tools to implement these todos step by step, following the workflow phases.`);

    throw error;
  }

  /**
   * Step mode - Execute next batch of todos following workflow
   */
  private async executeStep(taskId: string, mode: ExecutionMode, progression: ExecutionStep[]): Promise<ExecutionResult> {
    const todoAnalysis = await this.todoService.analyzeTodos(taskId);
    const taskMetadata = await this.taskService.getTaskMetadata(taskId);
    
    // Get next uncompleted todos (up to 3 for step mode)
    const uncompletedTodos = todoAnalysis.todos.filter(todo => !todo.completed);
    const todosToComplete = uncompletedTodos.slice(0, 3);

    if (todosToComplete.length === 0) {
      return {
        success: false,
        taskId,
        mode: 'step',
        finalStats: todoAnalysis.stats,
        message: 'No uncompleted todos found'
      };
    }

    progression.push({
      type: 'status_update',
      message: `Step mode: Working on next ${todosToComplete.length} todos`,
      completed: false,
      timestamp: new Date()
    });

    // Same approach: Guide the AI to do real work
    const remainingTodos = todoAnalysis.stats.total - todoAnalysis.stats.completed;
    const error = new Error(`WORKFLOW_STEP_EXECUTION_REQUIRED: Step execution for "${taskMetadata.title}"

Execute these ${todosToComplete.length} todos using development tools:

${todosToComplete.map(todo => `- ${todo.text}`).join('\n')}

After implementing each todo:
1. Use update_todos tool to mark it as completed
2. Verify your work with build/test commands
3. Continue to next todo

Progress: ${todoAnalysis.stats.completed}/${todoAnalysis.stats.total} completed
Remaining after this step: ${remainingTodos - todosToComplete.length} todos`);

    throw error;
  }

  /**
   * Batch mode - Execute multiple specific todos
   */
  private async executeBatch(taskId: string, mode: ExecutionMode, progression: ExecutionStep[]): Promise<ExecutionResult> {
    const todoAnalysis = await this.todoService.analyzeTodos(taskId);
    
    // Get next uncompleted todos (up to 5)
    const uncompletedTodos = todoAnalysis.todos.filter(todo => !todo.completed);
    const todosToComplete = uncompletedTodos.slice(0, 5);

    if (todosToComplete.length === 0) {
      return {
        success: false,
        taskId,
        mode: 'batch',
        finalStats: todoAnalysis.stats,
        message: 'No todos to complete'
      };
    }

    progression.push({
      type: 'status_update',
      message: `Processing batch of ${todosToComplete.length} todos`,
      completed: false,
      timestamp: new Date()
    });

    // Prepare batch updates
    const updates: TodoUpdateRequest[] = todosToComplete.map(todo => ({
      todoText: todo.text,
      completed: true
    }));

    // Show progress for each todo
    for (const todo of todosToComplete) {
      progression.push({
        type: 'todo',
        message: `Completed: ${todo.text}`,
        todoText: todo.text,
        completed: true,
        timestamp: new Date()
      });
    }

    // Execute batch update
    const updateResult = await this.todoService.updateTodos(taskId, updates);
    const finalAnalysis = await this.todoService.analyzeTodos(taskId);

    return {
      success: true,
      taskId,
      mode: 'batch',
      todosCompleted: updateResult.updated,
      totalTodos: todoAnalysis.stats.total,
      finalStats: finalAnalysis.stats,
      message: `Batch execution completed: ${updateResult.updated}/${todosToComplete.length} todos updated`
    };
  }

  private async updateTaskStatusBasedOnProgress(taskId: string, percentage: number): Promise<void> {
    try {
      // Get status values from workflow service
      const taskMetadata = await this.taskService.getTaskMetadata(taskId); 
      const recommendedStatus = this.workflowService.getNextRecommendedStatus(
        taskMetadata.status, 
        percentage
      );
      
      if (recommendedStatus && recommendedStatus !== taskMetadata.status) {
        await this.taskService.updateTaskStatus(taskId, recommendedStatus);
      }
    } catch (error) {
      // Status update failed, but execution continues
      console.warn('Failed to auto-update task status:', error);
    }
  }
}