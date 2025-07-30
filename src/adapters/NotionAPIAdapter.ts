import { TaskProvider } from '../interfaces/TaskProvider.js';
import { NotionTask } from '../models/Task.js';
import { TodoItem, TodoAnalysisResult, TodoUpdateRequest } from '../models/Todo.js';
import { Client } from '@notionhq/client';

export class NotionAPIAdapter implements TaskProvider {
  private notion: Client;
  private databaseId: string;
  private titleProperty: string | null = null;
  
  constructor(apiKey: string, databaseId: string) {
    this.notion = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  private async getTitlePropertyName(): Promise<string> {
    if (this.titleProperty) return this.titleProperty;
    
    try {
      const database = await this.notion.databases.retrieve({ database_id: this.databaseId });
      
      // Find the title property
      for (const [name, property] of Object.entries(database.properties)) {
        if ((property as any).type === 'title') {
          this.titleProperty = name;
          return name;
        }
      }
      
      throw new Error('No title property found in database');
    } catch (error) {
      throw new Error(`Failed to get database schema: ${error}`);
    }
  }

  getProviderName(): string {
    return 'Notion (Direct API)';
  }

  getProviderType(): string {
    return 'notion';
  }

  async getTask(taskId: string): Promise<NotionTask> {
    try {
      const page = await this.notion.pages.retrieve({ page_id: taskId });
      return this.mapNotionPageToTask(page);
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  async createTask(title: string, taskType: string, description: string): Promise<NotionTask> {
    try {
      const children = [];
      
      if (description) {
        children.push(...this.parseMarkdownToNotionBlocks(description));
      }
      
      const titlePropertyName = await this.getTitlePropertyName();
      const properties: any = {
        Type: { select: { name: taskType } },
        Status: { status: { name: 'Not started' } }
      };
      properties[titlePropertyName] = { title: [{ text: { content: title } }] };
      
      const page = await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties,
        children: children.length > 0 ? children : undefined
      });
      
      // Retrieve the full page to get properly formatted properties
      const fullPage = await this.notion.pages.retrieve({ page_id: page.id });
      return this.mapNotionPageToTask(fullPage);
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  async updateTask(taskId: string, updates: { title?: string; description?: string; taskType?: string }): Promise<void> {
    try {
      const properties: any = {};
      
      if (updates.title) {
        const titlePropertyName = await this.getTitlePropertyName();
        properties[titlePropertyName] = { title: [{ text: { content: updates.title } }] };
      }
      
      if (updates.taskType) {
        properties.Type = { select: { name: updates.taskType } };
      }

      await this.notion.pages.update({
        page_id: taskId,
        properties
      });

      if (updates.description) {
        // Note: Description updates require block-level operations 
        // and are not implemented in current version
        console.warn('Description updates not supported - requires block-level API calls');
      }
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      await this.notion.pages.update({
        page_id: taskId,
        properties: {
          Status: { status: { name: status } }
        }
      });
    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  async analyzeTodos(taskId: string, _includeHierarchy: boolean = false): Promise<TodoAnalysisResult> {
    try {
      const response = await this.notion.blocks.children.list({ 
        block_id: taskId 
      });
      const blocks = response.results;

      const todos = this.parseNotionBlocksToTodos(blocks);
      const stats = this.calculateStats(todos);

      return {
        todos,
        stats,
        content: this.generateContentFromBlocks(blocks),
        insights: this.generateInsights(stats),
        recommendations: this.generateRecommendations(stats),
        blockers: this.identifyBlockers(stats)
      };
    } catch (error) {
      throw new Error(`Failed to analyze todos: ${error}`);
    }
  }

  async updateTodos(taskId: string, updates: TodoUpdateRequest[]): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    try {
      const response = await this.notion.blocks.children.list({ 
        block_id: taskId 
      });
      const blocks = response.results;

      for (const update of updates) {
        try {
          const todoBlock = this.findTodoBlock(blocks, update.todoText);
          if (todoBlock && todoBlock.type === 'to_do') {
            await this.notion.blocks.update({
              block_id: todoBlock.id,
              to_do: {
                rich_text: todoBlock.to_do.rich_text,
                checked: update.completed
              }
            });
            updated++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      return { updated, failed };
    } catch (error) {
      throw new Error(`Failed to update todos: ${error}`);
    }
  }

  async updateSingleTodo(taskId: string, todoText: string, completed: boolean): Promise<boolean> {
    const result = await this.updateTodos(taskId, [{ todoText, completed }]);
    return result.updated > 0;
  }

  private mapNotionPageToTask(page: any): NotionTask {
    // Find the title property dynamically
    let title = 'Untitled';
    for (const [name, property] of Object.entries(page.properties || {})) {
      if ((property as any).type === 'title') {
        title = (property as any).title?.[0]?.text?.content || 'Untitled';
        break;
      }
    }
    
    const status = page.properties?.Status?.status?.name || 'Unknown';
    const type = page.properties?.Type?.select?.name || 'Unknown';
    
    return {
      id: page.id,
      title,
      status,
      type,
      url: page.url,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      properties: page.properties
    };
  }

  private parseMarkdownToNotionBlocks(markdown: string): any[] {
    const blocks = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
        const checked = trimmed.includes('[x]');
        const text = trimmed.replace(/^- \[[ x]\]\s*/, '');
        
        blocks.push({
          type: 'to_do',
          to_do: {
            rich_text: [{ type: 'text', text: { content: text } }],
            checked
          }
        });
      } else if (trimmed.startsWith('###')) {
        const text = trimmed.replace(/^###\s*/, '');
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: text } }]
          }
        });
      } else if (trimmed.startsWith('##')) {
        const text = trimmed.replace(/^##\s*/, '');
        blocks.push({
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: text } }]
          }
        });
      } else if (trimmed.startsWith('#')) {
        const text = trimmed.replace(/^#\s*/, '');
        blocks.push({
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: text } }]
          }
        });
      } else if (trimmed && !trimmed.startsWith('#')) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: line } }]
          }
        });
      }
    }

    return blocks;
  }

  private parseNotionBlocksToTodos(blocks: any[]): TodoItem[] {
    const todos: TodoItem[] = [];
    let todoIndex = 0;

    for (const block of blocks) {
      if (block.type === 'to_do') {
        const text = this.extractRichText(block.to_do.rich_text);
        todos.push({
          text,
          completed: block.to_do.checked || false,
          level: 0,
          index: todoIndex++,
          originalLine: `- [${block.to_do.checked ? 'x' : ' '}] ${text}`,
          lineNumber: todoIndex,
          isSubtask: false,
          children: []
        });
      }
    }

    return todos;
  }

  private findTodoBlock(blocks: any[], todoText: string): any | null {
    for (const block of blocks) {
      if (block.type === 'to_do') {
        const blockText = this.extractRichText(block.to_do.rich_text);
        if (blockText.trim() === todoText.trim()) {
          return block;
        }
      }
    }
    return null;
  }

  private extractRichText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(text => text.plain_text || text.text?.content || '').join('');
  }

  private calculateStats(todos: TodoItem[]) {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    const nextTodos = todos
      .filter(todo => !todo.completed)
      .slice(0, 3)
      .map(todo => todo.text);

    return { total, completed, percentage, nextTodos };
  }

  private generateContentFromBlocks(blocks: any[]): string {
    return blocks.map(block => {
      switch (block.type) {
        case 'to_do':
          const checked = block.to_do.checked ? '[x]' : '[ ]';
          const text = this.extractRichText(block.to_do.rich_text);
          return `- ${checked} ${text}`;
        case 'heading_1':
          return `# ${this.extractRichText(block.heading_1.rich_text)}`;
        case 'heading_2':
          return `## ${this.extractRichText(block.heading_2.rich_text)}`;
        case 'heading_3':
          return `### ${this.extractRichText(block.heading_3.rich_text)}`;
        case 'paragraph':
          return this.extractRichText(block.paragraph.rich_text);
        default:
          return '';
      }
    }).join('\n');
  }

  private generateInsights(stats: any): string[] {
    const insights = [`${stats.completed}/${stats.total} todos completed (${stats.percentage}%)`];
    
    if (stats.percentage === 100) {
      insights.push('Task fully completed');
    } else if (stats.percentage >= 75) {
      insights.push('Task almost complete');
    } else if (stats.percentage >= 50) {
      insights.push('Task more than halfway complete');
    } else if (stats.percentage > 0) {
      insights.push('Task in early progress');
    } else {
      insights.push('Task not yet started');
    }

    if (stats.nextTodos.length > 0) {
      insights.push(`Next ${stats.nextTodos.length} todo(s): ${stats.nextTodos.join(', ')}`);
    }

    return insights;
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations = [];
    
    if (stats.percentage === 0) {
      recommendations.push('Start with the first todo to begin progress');
    } else if (stats.percentage < 100) {
      recommendations.push('Focus on completing remaining todos');
      if (stats.total > 10) {
        recommendations.push('Consider breaking into smaller sub-tasks');
      }
    } else {
      recommendations.push('Task ready for review and completion');
    }

    return recommendations;
  }

  private identifyBlockers(stats: any): string[] {
    const blockers = [];
    
    if (stats.total === 0) {
      blockers.push('No todos found - task may need better structure');
    } else if (stats.total > 20) {
      blockers.push('Large number of todos might indicate task complexity');
    }

    return blockers;
  }
}