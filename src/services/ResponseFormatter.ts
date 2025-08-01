/**
 * ResponseFormatter - Format MCP responses for CLI output
 */

import { ExecutionResult } from '../models/Workflow.js';
import { TaskMetadata } from '../models/Task.js';
import { TodoAnalysisResult } from '../models/Todo.js';
import { NotionTask } from '../models/Task.js';

export class ResponseFormatter {
  
  formatExecutionResult(result: ExecutionResult): string {
    let text = `🚀 Task Execution (${result.mode.toUpperCase ? result.mode.toUpperCase() : result.mode} mode)\n\n`;
    
    text += `Task ID: ${result.taskId}\n`;
    text += `Success: ${result.success ? '✅' : '❌'}\n`;
    text += `Final Completion: ${result.finalStats.percentage}%\n\n`;

    if (result.sectionsProcessed !== undefined) {
      text += `Sections: ${result.sectionsProcessed}/${result.totalSections}\n`;
    }
    
    if (result.todosCompleted !== undefined) {
      text += `Todos: ${result.todosCompleted}/${result.totalTodos || result.finalStats.total}\n\n`;
    }

    // Show progression if available
    if (result.progression && result.progression.length > 0) {
      text += `📋 Execution Progress\n\n`;
      
      for (const step of result.progression) {
        const status = step.completed ? '✅' : '⏳';
        text += `${status} ${step.message}\n`;
        
        if (step.sectionName && step.type === 'section') {
          text += `   └ Section: "${step.sectionName}"\n`;
        }
        
        if (step.todoText && step.type === 'todo') {
          text += `   └ Todo: "${step.todoText}"\n`;
        }
      }
      text += `\n`;
    }

    text += `📊 Summary\n${result.message}`;
    return text;
  }

  formatTaskInfo(metadata: TaskMetadata): string {
    let text = `📋 Task Information\n\n`;
    
    text += `Title: ${metadata.title}\n`;
    text += `Status: ${metadata.status}\n`;
    text += `Type: ${metadata.type}\n`;
    text += `ID: ${metadata.id}\n\n`;
    
    text += `📊 Todo Statistics\n`;
    text += `- Total: ${metadata.todoStats.total}\n`;
    text += `- Completed: ${metadata.todoStats.completed}\n`;
    text += `- Progress: ${metadata.todoStats.percentage}%\n\n`;
    
    text += `🎯 Status Information\n`;
    text += `Current: ${metadata.statusInfo.current}\n`;
    text += `Available transitions: ${metadata.statusInfo.available.join(', ')}\n`;
    text += `Recommended: ${metadata.statusInfo.recommended || 'None'}\n\n`;
    text += `Next todos: ${metadata.todoStats.nextTodos.join(', ')}`;
    
    return text;
  }

  formatTaskCreated(task: NotionTask): string {
    let text = `✅ Task Created\n\n`;
    
    text += `Title: ${task.title}\n`;
    text += `Type: ${task.type}\n`;
    text += `Status: ${task.status}\n`;
    text += `ID: ${task.id}\n`;
    text += `URL: ${task.url}\n\n`;
    text += `Task created successfully and ready for execution.`;
    
    return text;
  }

  formatTaskUpdated(taskId: string, updates: Record<string, any>): string {
    let text = `✅ Task Updated\n\n`;
    
    text += `Task ID: ${taskId}\n`;
    text += `Updated fields: ${Object.keys(updates).join(', ')}\n\n`;
    text += `Task content updated successfully.`;
    
    return text;
  }

  formatTodoAnalysis(analysis: TodoAnalysisResult): string {
    let text = `📊 Todo Analysis\n\n`;
    
    text += `Task ID: ${analysis.todos[0]?.text || 'Unknown'}\n`;
    text += `Total todos: ${analysis.stats.total}\n`;
    text += `Completed: ${analysis.stats.completed}\n`;
    text += `Progress: ${analysis.stats.percentage}%\n\n`;
    
    text += `💡 Insights\n`;
    text += `${analysis.insights.map(i => `- ${i}`).join('\n')}\n\n`;
    
    text += `🎯 Recommendations\n`;
    text += `${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\n`;
    
    if (analysis.blockers.length > 0) {
      text += `⚠️ Blockers\n`;
      text += `${analysis.blockers.map(b => `- ${b}`).join('\n')}`;
    }
    
    return text;
  }

  formatTodosUpdated(taskId: string, result: { updated: number, failed: number }): string {
    let text = `✅ Todos Updated\n\n`;
    
    text += `Task ID: ${taskId}\n`;
    text += `Successfully updated: ${result.updated}\n`;
    text += `Failed: ${result.failed}\n\n`;
    text += `Batch todo update completed.`;
    
    return text;
  }
}