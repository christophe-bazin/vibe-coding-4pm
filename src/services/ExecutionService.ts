/**
 * ExecutionService - THE MAIN SERVICE for task execution
 */

import { TaskService } from './TaskService.js';
import { TodoService } from './TodoService.js';
import { WorkflowService } from './WorkflowService.js';
import { ExecutionMode, ExecutionResult, ExecutionStep } from '../models/Workflow.js';
import { TodoUpdateRequest } from '../models/Todo.js';

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

    // If no todos at all, provide general execution guidance
    if (todoAnalysis.stats.total === 0) {
      // Update task to In Progress if not already
      if (taskMetadata.status === 'Not Started') {
        await this.taskService.updateTask(taskId, { status: 'In Progress' });
        progression.push({
          type: 'status_update',
          message: 'Task status updated to "In Progress"',
          completed: true,
          timestamp: new Date()
        });
      }

      progression.push({
        type: 'status_update',
        message: `Auto execution guidance for task: ${taskMetadata.title}`,
        completed: true,
        timestamp: new Date()
      });

      let guidanceMessage = `🚀 AUTO EXECUTION GUIDANCE for "${taskMetadata.title}"\n\n`;
      guidanceMessage += `📋 Task Context Analysis\n`;
      guidanceMessage += `- No structured todos found in task description\n`;
      guidanceMessage += `- Analyze task requirements from description\n`;
      guidanceMessage += `- Break down work into implementation steps\n\n`;
      
      guidanceMessage += `⚡ Implementation Process\n`;
      guidanceMessage += `1. Read and understand the task description thoroughly\n`;
      guidanceMessage += `2. Identify what needs to be built/fixed/improved\n`;
      guidanceMessage += `3. Plan your approach and implementation steps\n`;
      guidanceMessage += `4. Execute the work using development tools (Read, Edit, Write, Bash)\n`;
      guidanceMessage += `5. Test and validate your implementation\n\n`;
      
      guidanceMessage += `🧪 Testing & Validation\n`;
      guidanceMessage += `- Build/compile to check for errors\n`;
      guidanceMessage += `- Test functionality if applicable\n`;
      guidanceMessage += `- Validate against task requirements\n\n`;
      
      guidanceMessage += `✅ Completion\n`;
      guidanceMessage += `- When work is complete, move task to "Test" status\n`;
      guidanceMessage += `- Provide summary of work completed\n`;
      guidanceMessage += `- List what should be tested/validated\n\n`;
      
      guidanceMessage += `📊 Current Status: Ready for implementation`;

      return {
        success: true,
        taskId,
        mode: mode.type,
        finalStats: todoAnalysis.stats,
        message: guidanceMessage
      };
    }

    // If all todos completed
    if (uncompletedTodos.length === 0) {
      return {
        success: true,
        taskId,
        mode: mode.type,
        finalStats: todoAnalysis.stats,
        message: 'All todos already completed'
      };
    }

    // Update task to In Progress if not already
    if (taskMetadata.status === 'Not Started') {
      await this.taskService.updateTask(taskId, { status: 'In Progress' });
      progression.push({
        type: 'status_update',
        message: 'Task status updated to "In Progress"',
        completed: true,
        timestamp: new Date()
      });
    }

    progression.push({
      type: 'status_update',
      message: `Auto execution guidance for task: ${taskMetadata.title}`,
      completed: true,
      timestamp: new Date()
    });

    // Provide structured guidance instead of throwing errors
    let guidanceMessage = `🚀 AUTO EXECUTION GUIDANCE for "${taskMetadata.title}"\n\n`;
    guidanceMessage += `📋 Phase 1: Understanding & Planning\n`;
    guidanceMessage += `- Review task description and requirements\n`;
    guidanceMessage += `- Understand the codebase context\n`;
    guidanceMessage += `- Plan implementation approach\n\n`;
    
    guidanceMessage += `⚡ Phase 2: Implementation (${uncompletedTodos.length} todos)\n`;
    uncompletedTodos.forEach((todo, index) => {
      guidanceMessage += `${index + 1}. ${todo.text}\n`;
    });
    guidanceMessage += `\n`;
    
    guidanceMessage += `🧪 Phase 3: Testing & Validation\n`;
    guidanceMessage += `- Run build/compile to check for errors\n`;
    guidanceMessage += `- Test functionality if applicable\n`;
    guidanceMessage += `- Validate against requirements\n\n`;
    
    guidanceMessage += `✅ Phase 4: Completion\n`;
    guidanceMessage += `- Use update_todos to mark completed items\n`;
    guidanceMessage += `- Task will auto-progress to "Test" when 100% complete\n`;
    guidanceMessage += `- Provide summary of work completed\n\n`;
    
    guidanceMessage += `📊 Current Progress: ${todoAnalysis.stats.completed}/${todoAnalysis.stats.total} todos (${todoAnalysis.stats.percentage}%)`;

    return {
      success: true,
      taskId,
      mode: mode.type,
      finalStats: todoAnalysis.stats,
      message: guidanceMessage
    };
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

    // If no todos at all, provide general step guidance
    if (todoAnalysis.stats.total === 0) {
      // Update task to In Progress if not already
      if (taskMetadata.status === 'Not Started') {
        await this.taskService.updateTask(taskId, { status: 'In Progress' });
        progression.push({
          type: 'status_update',
          message: 'Task status updated to "In Progress"',
          completed: true,
          timestamp: new Date()
        });
      }

      progression.push({
        type: 'status_update',
        message: `Step mode: Focus on task context`,
        completed: true,
        timestamp: new Date()
      });

      let stepMessage = `🔄 STEP EXECUTION GUIDANCE for "${taskMetadata.title}"\n\n`;
      stepMessage += `📋 Current Step: Context Analysis\n`;
      stepMessage += `- No structured todos found in task description\n`;
      stepMessage += `- Analyze task requirements and break into steps\n`;
      stepMessage += `- Focus on understanding what needs to be implemented\n\n`;
      
      stepMessage += `📋 Step Process:\n`;
      stepMessage += `1. Read task description thoroughly\n`;
      stepMessage += `2. Identify 2-3 immediate next steps\n`;
      stepMessage += `3. Implement using development tools (Read, Edit, Write, Bash)\n`;
      stepMessage += `4. Test/validate your implementation\n`;
      stepMessage += `5. Move to "Test" status when complete\n\n`;
      
      stepMessage += `📊 Progress Status:\n`;
      stepMessage += `- Ready for implementation based on task context\n`;
      stepMessage += `- Break work into manageable steps as you progress`;

      return {
        success: true,
        taskId,
        mode: mode.type,
        finalStats: todoAnalysis.stats,
        message: stepMessage
      };
    }

    if (todosToComplete.length === 0) {
      return {
        success: true,
        taskId,
        mode: mode.type,
        finalStats: todoAnalysis.stats,
        message: 'No uncompleted todos found - task may be complete'
      };
    }

    // Update task to In Progress if not already
    if (taskMetadata.status === 'Not Started') {
      await this.taskService.updateTask(taskId, { status: 'In Progress' });
      progression.push({
        type: 'status_update',
        message: 'Task status updated to "In Progress"',
        completed: true,
        timestamp: new Date()
      });
    }

    progression.push({
      type: 'status_update',
      message: `Step mode: Focus on next ${todosToComplete.length} todos`,
      completed: true,
      timestamp: new Date()
    });

    // Provide structured step guidance
    const remainingAfterStep = uncompletedTodos.length - todosToComplete.length;
    let stepMessage = `🔄 STEP EXECUTION GUIDANCE for "${taskMetadata.title}"\n\n`;
    stepMessage += `🎯 Current Step: Focus on these ${todosToComplete.length} todos:\n`;
    todosToComplete.forEach((todo, index) => {
      stepMessage += `${index + 1}. ${todo.text}\n`;
    });
    stepMessage += `\n`;
    
    stepMessage += `📋 Step Process:\n`;
    stepMessage += `1. Implement each todo using development tools (Read, Edit, Write, Bash)\n`;
    stepMessage += `2. Test/validate your implementation\n`;
    stepMessage += `3. Use update_todos to mark completed todos\n`;
    stepMessage += `4. Run this step mode again for remaining todos\n\n`;
    
    stepMessage += `📊 Progress Status:\n`;
    stepMessage += `- Completed: ${todoAnalysis.stats.completed}/${todoAnalysis.stats.total} todos (${todoAnalysis.stats.percentage}%)\n`;
    if (remainingAfterStep > 0) {
      stepMessage += `- After this step: ${remainingAfterStep} todos remaining\n`;
    } else {
      stepMessage += `- This is the final step! Task will be ready for testing.\n`;
    }

    return {
      success: true,
      taskId,
      mode: mode.type,
      finalStats: todoAnalysis.stats,
      message: stepMessage
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
        mode: mode.type,
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
      mode: mode.type,
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
        await this.taskService.updateTask(taskId, { status: recommendedStatus });
      }
    } catch (error) {
      // Status update failed, but execution continues
      console.warn('Failed to auto-update task status:', error);
    }
  }
}