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
   * Auto mode - Execute all todos automatically
   */
  private async executeAuto(taskId: string, mode: ExecutionMode, progression: ExecutionStep[]): Promise<ExecutionResult> {
    const todoAnalysis = await this.todoService.analyzeTodos(taskId);
    
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
      message: `Auto-completing ${uncompletedTodos.length} todos`,
      completed: false,
      timestamp: new Date()
    });

    // Prepare batch updates
    const updates: TodoUpdateRequest[] = [];
    
    for (const todo of uncompletedTodos) {
      updates.push({ todoText: todo.text, completed: true });
      
      if (mode.showProgress) {
        progression.push({
          type: 'todo',
          message: `Completed: ${todo.text}`,
          todoText: todo.text,
          completed: true,
          timestamp: new Date()
        });
      }
    }

    // Execute batch update
    const updateResult = await this.todoService.updateTodos(taskId, updates);
    const finalAnalysis = await this.todoService.analyzeTodos(taskId);

    progression.push({
      type: 'status_update',
      message: `Auto execution completed: ${updateResult.updated}/${uncompletedTodos.length} todos updated`,
      completed: true,
      timestamp: new Date()
    });

    return {
      success: true,
      taskId,
      mode: 'auto',
      todosCompleted: updateResult.updated,
      totalTodos: todoAnalysis.stats.total,
      finalStats: finalAnalysis.stats,
      message: `Auto execution completed: ${updateResult.updated}/${uncompletedTodos.length} todos completed`
    };
  }

  /**
   * Step mode - Execute next batch of uncompleted todos (simpler approach)
   */
  private async executeStep(taskId: string, mode: ExecutionMode, progression: ExecutionStep[]): Promise<ExecutionResult> {
    const todoAnalysis = await this.todoService.analyzeTodos(taskId);
    
    // Get next uncompleted todos (up to 5 for step mode)
    const uncompletedTodos = todoAnalysis.todos.filter(todo => !todo.completed);
    const todosToComplete = uncompletedTodos.slice(0, 5);

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
      message: `Working on next ${todosToComplete.length} todos`,
      completed: false,
      timestamp: new Date()
    });

    // Execute todos
    const updates: TodoUpdateRequest[] = [];

    for (const todo of todosToComplete) {
      updates.push({ todoText: todo.text, completed: true });
      
      progression.push({
        type: 'todo',
        message: `Completed: ${todo.text}`,
        todoText: todo.text,
        completed: true,
        timestamp: new Date()
      });
    }

    const updateResult = await this.todoService.updateTodos(taskId, updates);
    const finalAnalysis = await this.todoService.analyzeTodos(taskId);

    progression.push({
      type: 'status_update',
      message: `Step completed: ${updateResult.updated}/${todosToComplete.length} todos updated`,
      completed: true,
      timestamp: new Date()
    });

    const hasMoreTodos = finalAnalysis.stats.completed < finalAnalysis.stats.total;

    return {
      success: true,
      taskId,
      mode: 'step',
      todosCompleted: updateResult.updated,
      totalTodos: todoAnalysis.stats.total,
      finalStats: finalAnalysis.stats,
      message: hasMoreTodos 
        ? `Step completed. ${finalAnalysis.stats.total - finalAnalysis.stats.completed} todos remaining. Call execute_task again to continue.`
        : 'All todos completed!'
    };
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