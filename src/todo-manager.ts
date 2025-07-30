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
      // Get current blocks with their IDs
      const blocks = await this.notion.blocks.children.list({
        block_id: taskId,
        page_size: 100
      });

      // Find the specific todo block to update
      const todoBlock = await this.findTodoBlockByText(blocks.results, todoText);
      if (!todoBlock) {
        throw new Error(`Todo not found: "${todoText}"`);
      }

      // Update ONLY this specific block
      await this.notion.blocks.update({
        block_id: todoBlock.id,
        to_do: {
          rich_text: todoBlock.to_do.rich_text,
          checked: completed
        }
      });

      // Get fresh analysis for stats (without re-parsing everything)
      const analysis = await this.extractTodosFromTask(taskId);
      
      return {
        success: true,
        updatedContent: analysis.content,
        stats: analysis.stats
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
      // Get current blocks with their IDs
      const blocks = await this.notion.blocks.children.list({
        block_id: taskId,
        page_size: 100
      });

      // Update each todo block individually
      for (const update of updates) {
        const todoBlock = await this.findTodoBlockByText(blocks.results, update.todoText);
        if (todoBlock) {
          await this.notion.blocks.update({
            block_id: todoBlock.id,
            to_do: {
              rich_text: todoBlock.to_do.rich_text,
              checked: update.completed
            }
          });
        }
      }

      // Get fresh analysis for stats
      const analysis = await this.extractTodosFromTask(taskId);

      return {
        success: true,
        updatedContent: analysis.content,
        stats: analysis.stats
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
   * Find a todo block by matching text content
   */
  private async findTodoBlockByText(blocks: any[], searchText: string): Promise<any | null> {
    const normalizedSearch = searchText.toLowerCase().trim();
    
    for (const block of blocks) {
      if (block.type === 'to_do' && block.to_do?.rich_text) {
        const blockText = this.extractRichText(block.to_do.rich_text).toLowerCase().trim();
        
        // Try exact match first
        if (blockText === normalizedSearch) {
          return block;
        }
        
        // Then partial match
        if (blockText.includes(normalizedSearch) || normalizedSearch.includes(blockText)) {
          return block;
        }
        
        // Finally fuzzy match
        const cleanSearch = normalizedSearch.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
        const cleanBlock = blockText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
        if (cleanBlock.includes(cleanSearch) || cleanSearch.includes(cleanBlock)) {
          return block;
        }
      }
    }
    
    return null;
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
}