/**
 * ResponseFormatter - Format MCP responses (move logic OUT of server)
 */

import { ExecutionResult } from '../models/Workflow.js';
import { TaskMetadata } from '../models/Task.js';
import { TodoAnalysisResult } from '../models/Todo.js';
import { NotionTask } from '../models/Task.js';

export class ResponseFormatter {
  
  formatExecutionResult(result: ExecutionResult): string {
    let text = `# 🚀 Task Execution (${result.mode.toUpperCase()} mode)\n\n`;
    text += `**Task ID:** ${result.taskId}\n`;
    text += `**Success:** ${result.success ? '✅' : '❌'}\n`;
    text += `**Final Completion:** ${result.finalStats.percentage}%\n\n`;

    if (result.sectionsProcessed !== undefined) {
      text += `**Sections:** ${result.sectionsProcessed}/${result.totalSections}\n`;
    }
    
    if (result.todosCompleted !== undefined) {
      text += `**Todos:** ${result.todosCompleted}/${result.totalTodos || result.finalStats.total}\n\n`;
    }

    // Show progression if available
    if (result.progression && result.progression.length > 0) {
      text += `## 📋 Execution Progress:\n\n`;
      
      for (const step of result.progression) {
        const status = step.completed ? '✅' : '⏳';
        text += `${status} **${step.message}**\n`;
        
        if (step.sectionName && step.type === 'section') {
          text += `   └ Section: "${step.sectionName}"\n`;
        }
        
        if (step.todoText && step.type === 'todo') {
          text += `   └ Todo: "${step.todoText}"\n`;
        }
      }
      text += `\n`;
    }

    text += `## 📊 Summary\n${result.message}`;
    return text;
  }

  formatTaskInfo(metadata: TaskMetadata): string {
    return `# 📋 Task Information\n\n` +
      `**Title:** ${metadata.title}\n` +
      `**Status:** ${metadata.status}\n` +
      `**Type:** ${metadata.type}\n` +
      `**ID:** ${metadata.id}\n\n` +
      `## 📊 Todo Statistics\n` +
      `- **Total:** ${metadata.todoStats.total}\n` +
      `- **Completed:** ${metadata.todoStats.completed}\n` +
      `- **Progress:** ${metadata.todoStats.percentage}%\n\n` +
      `## 🎯 Status Information\n` +
      `**Current:** ${metadata.statusInfo.current}\n` +
      `**Available transitions:** ${metadata.statusInfo.available.join(', ')}\n` +
      `**Recommended:** ${metadata.statusInfo.recommended || 'None'}\n\n` +
      `**Next todos:** ${metadata.todoStats.nextTodos.join(', ')}`;
  }

  formatTaskCreated(task: NotionTask): string {
    return `# ✅ Task Created\n\n` +
      `**Title:** ${task.title}\n` +
      `**Type:** ${task.type}\n` +
      `**Status:** ${task.status}\n` +
      `**ID:** ${task.id}\n` +
      `**URL:** ${task.url}\n\n` +
      `Task created successfully and ready for execution.`;
  }

  formatTaskUpdated(taskId: string, updates: Record<string, any>): string {
    return `# ✅ Task Updated\n\n` +
      `**Task ID:** ${taskId}\n` +
      `**Updated fields:** ${Object.keys(updates).join(', ')}\n\n` +
      `Task content updated successfully.`;
  }

  formatTodoAnalysis(analysis: TodoAnalysisResult): string {
    return `# 📊 Todo Analysis\n\n` +
      `**Task ID:** ${analysis.todos[0]?.text || 'Unknown'}\n` +
      `**Total todos:** ${analysis.stats.total}\n` +
      `**Completed:** ${analysis.stats.completed}\n` +
      `**Progress:** ${analysis.stats.percentage}%\n\n` +
      `## 💡 Insights\n${analysis.insights.map(i => `- ${i}`).join('\n')}\n\n` +
      `## 🎯 Recommendations\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\n` +
      `${analysis.blockers.length > 0 ? `## ⚠️ Blockers\n${analysis.blockers.map(b => `- ${b}`).join('\n')}` : ''}`;
  }

  formatStatusUpdated(taskId: string, newStatus: string): string {
    return `# ✅ Status Updated\n\n` +
      `**Task ID:** ${taskId}\n` +
      `**New Status:** ${newStatus}\n\n` +
      `Status updated successfully.`;
  }

  formatTodosUpdated(taskId: string, result: { updated: number, failed: number }): string {
    return `# ✅ Todos Updated\n\n` +
      `**Task ID:** ${taskId}\n` +
      `**Successfully updated:** ${result.updated}\n` +
      `**Failed:** ${result.failed}\n\n` +
      `Batch todo update completed.`;
  }
}