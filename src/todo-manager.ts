/**
 * Todo Manager for Notion Vibe Coding
 * 
 * Handles parsing, updating and managing todos in Notion task content
 */

import { Client } from '@notionhq/client';

export interface TodoItem {
  text: string;
  completed: boolean;
  level: number;
  index: number;
  originalLine: string;
  lineNumber: number;
}

export interface TodoStats {
  total: number;
  completed: number;
  percentage: number;
  nextTodos: string[];
}

export interface TodoAnalysisResult {
  todos: TodoItem[];
  stats: TodoStats;
  content: string;
}

export class TodoManager {
  private notion: Client;

  constructor(notion: Client) {
    this.notion = notion;
  }

  /**
   * Extract all todos from a Notion page content
   */
  async extractTodosFromTask(taskId: string, includeHierarchy: boolean = false): Promise<TodoAnalysisResult> {
    try {
      // Get all blocks from the page
      const blocks = await this.notion.blocks.children.list({
        block_id: taskId,
        page_size: 100
      });

      let content = '';
      const todos: TodoItem[] = [];
      let lineNumber = 0;

      for (const block of blocks.results) {
        const blockContent = this.extractTextFromBlock(block);
        if (blockContent) {
          content += blockContent + '\n';
          
          // Parse todos from this block
          const blockTodos = this.parseTodosFromText(blockContent, lineNumber, includeHierarchy);
          todos.push(...blockTodos);
          
          lineNumber += blockContent.split('\n').length;
        }
      }

      const stats = this.calculateTodoStats(todos);

      return {
        todos,
        stats,
        content: content.trim()
      };
    } catch (error) {
      throw new Error(`Failed to extract todos from task: ${error}`);
    }
  }

  /**
   * Update a specific todo in a task
   */
  async updateTodo(
    taskId: string, 
    todoText: string, 
    completed: boolean
  ): Promise<{ success: boolean; updatedContent: string; stats: TodoStats }> {
    try {
      // Get current task analysis
      const analysis = await this.extractTodosFromTask(taskId);
      
      // Find the todo to update using fuzzy matching
      const todoToUpdate = this.findTodoByText(analysis.todos, todoText);
      if (!todoToUpdate) {
        throw new Error(`Todo not found: "${todoText}"`);
      }

      // Update the content
      const updatedContent = this.updateTodoInContent(
        analysis.content, 
        todoToUpdate, 
        completed
      );

      // Update the Notion page
      await this.updateNotionPageContent(taskId, updatedContent);

      // Recalculate stats
      const updatedTodos = analysis.todos.map(todo => 
        todo.index === todoToUpdate.index 
          ? { ...todo, completed }
          : todo
      );
      const newStats = this.calculateTodoStats(updatedTodos);

      return {
        success: true,
        updatedContent,
        stats: newStats
      };
    } catch (error) {
      throw new Error(`Failed to update todo: ${error}`);
    }
  }

  /**
   * Update multiple todos in batch
   */
  async batchUpdateTodos(
    taskId: string,
    updates: Array<{ todoText: string; completed: boolean }>
  ): Promise<{ success: boolean; updatedContent: string; stats: TodoStats }> {
    try {
      const analysis = await this.extractTodosFromTask(taskId);
      let content = analysis.content;

      // Apply all updates
      for (const update of updates) {
        const todoToUpdate = this.findTodoByText(analysis.todos, update.todoText);
        if (todoToUpdate) {
          content = this.updateTodoInContent(content, todoToUpdate, update.completed);
          // Update the todo in our local analysis for next iterations
          todoToUpdate.completed = update.completed;
        }
      }

      // Update the Notion page once with all changes
      await this.updateNotionPageContent(taskId, content);

      // Calculate final stats
      const newStats = this.calculateTodoStats(analysis.todos);

      return {
        success: true,
        updatedContent: content,
        stats: newStats
      };
    } catch (error) {
      throw new Error(`Failed to batch update todos: ${error}`);
    }
  }

  /**
   * Parse todos from text content
   */
  private parseTodosFromText(text: string, startLineNumber: number, includeHierarchy: boolean): TodoItem[] {
    const todos: TodoItem[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line !== undefined) {
        const todo = this.parseTodoFromLine(line, startLineNumber + i, includeHierarchy);
        if (todo) {
          todos.push(todo);
        }
      }
    }

    return todos;
  }

  /**
   * Parse a single todo from a line
   */
  private parseTodoFromLine(line: string, lineNumber: number, includeHierarchy: boolean): TodoItem | null {
    // Support multiple todo formats:
    // - [ ] Todo text
    // - [x] Completed todo
    // * [ ] Alternative format
    // 1. [ ] Numbered todo
    
    const todoRegex = /^(\s*)([-*]|\d+\.)\s*\[([ x])\]\s*(.+)$/i;
    const match = line.match(todoRegex);
    
    if (!match) {
      return null;
    }

    const [, indentation = '', , checkmark = ' ', text = ''] = match;
    const level = includeHierarchy ? Math.floor(indentation.length / 2) : 0;
    const completed = checkmark.toLowerCase() === 'x';

    return {
      text: text.trim(),
      completed,
      level,
      index: lineNumber,
      originalLine: line,
      lineNumber
    };
  }

  /**
   * Calculate todo statistics
   */
  private calculateTodoStats(todos: TodoItem[]): TodoStats {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    // Get next 3 uncompleted todos
    const nextTodos = todos
      .filter(todo => !todo.completed)
      .slice(0, 3)
      .map(todo => todo.text);

    return {
      total,
      completed,
      percentage,
      nextTodos
    };
  }

  /**
   * Find todo by text using fuzzy matching
   */
  private findTodoByText(todos: TodoItem[], searchText: string): TodoItem | null {
    const normalizedSearch = searchText.toLowerCase().trim();
    
    // First try exact match
    let found = todos.find(todo => 
      todo.text.toLowerCase().trim() === normalizedSearch
    );
    
    if (found) return found;

    // Then try partial match
    found = todos.find(todo => 
      todo.text.toLowerCase().includes(normalizedSearch) ||
      normalizedSearch.includes(todo.text.toLowerCase())
    );

    if (found) return found;

    // Finally try fuzzy match (remove punctuation and extra spaces)
    const cleanSearch = normalizedSearch.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    found = todos.find(todo => {
      const cleanTodo = todo.text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
      return cleanTodo.includes(cleanSearch) || cleanSearch.includes(cleanTodo);
    });

    return found || null;
  }

  /**
   * Update todo status in content string
   */
  private updateTodoInContent(content: string, todo: TodoItem, completed: boolean): string {
    const lines = content.split('\n');
    const targetLine = lines[todo.lineNumber];
    
    if (targetLine === undefined) {
      throw new Error(`Line ${todo.lineNumber} not found in content`);
    }

    // Replace the checkbox
    const newCheckmark = completed ? 'x' : ' ';
    const updatedLine = targetLine.replace(
      /\[([ x])\]/i, 
      `[${newCheckmark}]`
    );

    lines[todo.lineNumber] = updatedLine;
    return lines.join('\n');
  }

  /**
   * Extract text content from a Notion block
   */
  private extractTextFromBlock(block: any): string {
    try {
      switch (block.type) {
        case 'paragraph':
          return this.extractRichText(block.paragraph?.rich_text || []);
        case 'bulleted_list_item':
          return this.extractRichText(block.bulleted_list_item?.rich_text || []);
        case 'numbered_list_item':
          return this.extractRichText(block.numbered_list_item?.rich_text || []);
        case 'to_do':
          const checked = block.to_do?.checked ? '[x]' : '[ ]';
          const text = this.extractRichText(block.to_do?.rich_text || []);
          return `- ${checked} ${text}`;
        case 'heading_1':
          return `# ${this.extractRichText(block.heading_1?.rich_text || [])}`;
        case 'heading_2':
          return `## ${this.extractRichText(block.heading_2?.rich_text || [])}`;
        case 'heading_3':
          return `### ${this.extractRichText(block.heading_3?.rich_text || [])}`;
        default:
          return '';
      }
    } catch (error) {
      console.warn(`Error extracting text from block: ${error}`);
      return '';
    }
  }

  /**
   * Extract plain text from Notion rich text array
   */
  private extractRichText(richText: any[]): string {
    return richText
      .map((text: any) => text.plain_text || '')
      .join('');
  }

  /**
   * Update Notion page content
   */
  private async updateNotionPageContent(taskId: string, newContent: string): Promise<void> {
    try {
      // Get current blocks
      const blocks = await this.notion.blocks.children.list({
        block_id: taskId
      });

      // Delete existing blocks
      for (const block of blocks.results) {
        await this.notion.blocks.delete({
          block_id: block.id
        });
      }

      // Create new blocks from content
      const newBlocks = this.contentToNotionBlocks(newContent);
      
      if (newBlocks.length > 0) {
        await this.notion.blocks.children.append({
          block_id: taskId,
          children: newBlocks
        });
      }
    } catch (error) {
      throw new Error(`Failed to update Notion page content: ${error}`);
    }
  }

  /**
   * Convert content string to Notion blocks
   */
  private contentToNotionBlocks(content: string): any[] {
    const lines = content.split('\n');
    const blocks = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Parse different content types
      if (line.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: line.substring(2) } }]
          }
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: line.substring(3) } }]
          }
        });
      } else if (line.startsWith('### ')) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: line.substring(4) } }]
          }
        });
      } else if (line.match(/^\s*[-*]\s*\[([ x])\]/i)) {
        // Todo item
        const match = line.match(/^\s*[-*]\s*\[([ x])\]\s*(.+)$/i);
        if (match) {
          const [, checkmark = ' ', text = ''] = match;
          blocks.push({
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [{ type: 'text', text: { content: text } }],
              checked: checkmark.toLowerCase() === 'x'
            }
          });
        }
      } else {
        // Regular paragraph
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: line } }]
          }
        });
      }
    }

    return blocks;
  }
}