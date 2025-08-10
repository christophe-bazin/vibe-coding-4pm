import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { Task } from '../../models/Task.js';
import { TodoItem, TodoAnalysisResult, TodoUpdateRequest } from '../../models/Todo.js';
import { PageContent, LinkedPage, NotionBlock } from '../../models/Page.js';
import { Client } from '@notionhq/client';

export class NotionProvider implements TaskProvider {
  private notion: Client;
  private databaseId: string;
  private titleProperty: string | null = null;
  
  constructor(apiKey: string, databaseId: string) {
    console.log(`🔧 NotionProvider: apiKey=${apiKey?.substring(0,10)}...`);
    console.log(`🔧 NotionProvider: databaseId=${databaseId}`);
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

  async appendToTask(taskId: string, content: string): Promise<void> {
    try {
      // Convert markdown content to Notion blocks
      const blocks = this.markdownToNotionBlocks(content);
      
      // Append blocks to the Notion page
      await this.notion.blocks.children.append({
        block_id: taskId,
        children: blocks
      });
    } catch (error) {
      throw new Error(`Failed to append content to task: ${error}`);
    }
  }

  private markdownToNotionBlocks(markdown: string): any[] {
    const blocks: any[] = [];
    const lines = markdown.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        continue;
      }
      
      if (trimmed === '---') {
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {}
        });
        continue;
      }
      
      if (trimmed.startsWith('# ')) {
        blocks.push({
          object: 'block',
          type: 'heading_1',
          heading_1: { rich_text: [{ type: 'text', text: { content: trimmed.slice(2) } }] }
        });
      } else if (trimmed.startsWith('## ')) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: { rich_text: [{ type: 'text', text: { content: trimmed.slice(3) } }] }
        });
      } else if (trimmed.startsWith('- [ ] ')) {
        blocks.push({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ type: 'text', text: { content: trimmed.slice(6) } }],
            checked: false
          }
        });
      } else if (trimmed.startsWith('- ✅ ')) {
        blocks.push({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ type: 'text', text: { content: trimmed.slice(4) } }],
            checked: true
          }
        });
      } else if (trimmed.startsWith('- ')) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: [{ type: 'text', text: { content: trimmed.slice(2) } }] }
        });
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ 
              type: 'text', 
              text: { content: trimmed.slice(2, -2) },
              annotations: { bold: true }
            }]
          }
        });
      } else {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: trimmed } }] }
        });
      }
    }
    
    return blocks;
  }

  getProviderName(): string {
    return 'Notion (Direct API)';
  }

  getProviderType(): string {
    return 'notion';
  }

  /**
   * Retrieve a task by its ID
   * @param taskId - The unique identifier of the task
   * @returns Promise resolving to the task data
   * @throws Error if task cannot be retrieved
   */
  async getTask(taskId: string): Promise<Task> {
    try {
      const page = await this.notion.pages.retrieve({ page_id: taskId });
      return this.mapNotionPageToTask(page);
    } catch (error) {
      throw new Error(`Failed to get task: ${error}`);
    }
  }

  /**
   * Create a new task in the provider system
   * @param title - Task title (required, max 200 characters)
   * @param taskType - Type of task (required)
   * @param description - Task description with markdown support
   * @returns Promise resolving to the created task
   * @throws Error if validation fails or creation fails
   */
  async createTask(title: string, taskType: string, description: string): Promise<Task> {
    // Input validation
    if (!title || title.trim().length === 0) {
      throw new Error('Title is required and cannot be empty');
    }
    if (!taskType || taskType.trim().length === 0) {
      throw new Error('Task type is required and cannot be empty');
    }
    if (title.length > 200) {
      throw new Error('Title cannot exceed 200 characters');
    }

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

  async updateTask(taskId: string, updates: { title?: string; taskType?: string; status?: string }): Promise<void> {
    try {
      const properties: any = {};
      
      if (updates.title) {
        const titlePropertyName = await this.getTitlePropertyName();
        properties[titlePropertyName] = { title: [{ text: { content: updates.title } }] };
      }
      
      if (updates.taskType) {
        properties.Type = { select: { name: updates.taskType } };
      }

      if (updates.status) {
        properties.Status = { status: { name: updates.status } };
      }

      await this.notion.pages.update({
        page_id: taskId,
        properties
      });
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

  async analyzeTodos(taskId: string, includeHierarchy: boolean = false): Promise<TodoAnalysisResult> {
    try {
      const [blocksResponse, taskResponse] = await Promise.all([
        this.notion.blocks.children.list({ block_id: taskId }),
        this.notion.pages.retrieve({ page_id: taskId })
      ]);
      
      const blocks = blocksResponse.results;
      const taskTitle = this.extractTaskTitle(taskResponse);

      const todos = this.parseNotionBlocksToTodos(blocks, includeHierarchy, taskTitle);
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

  private mapNotionPageToTask(page: any): Task {
    // Find the title property dynamically
    let title = 'Untitled';
    for (const [, property] of Object.entries(page.properties || {})) {
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
    let inCodeBlock = false;
    let codeBlockContent = [];
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      const trimmed = line.trim();
      
      // Handle code blocks
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLanguage = trimmed.replace(/^```/, '').trim();
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          blocks.push({
            type: 'code',
            code: {
              rich_text: [{ type: 'text', text: { content: codeBlockContent.join('\n') } }],
              language: codeBlockLanguage || 'plain text'
            }
          });
          codeBlockContent = [];
          codeBlockLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }
      
      // Handle todos
      if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
        const checked = trimmed.includes('[x]');
        const text = trimmed.replace(/^- \[[ x]\]\s*/, '');
        
        blocks.push({
          type: 'to_do',
          to_do: {
            rich_text: this.parseRichText(text),
            checked
          }
        });
      }
      // Handle bullet lists
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[*-]\s*/, '');
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: this.parseRichText(text)
          }
        });
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(trimmed)) {
        const text = trimmed.replace(/^\d+\.\s*/, '');
        blocks.push({
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: this.parseRichText(text)
          }
        });
      }
      // Handle headings
      else if (trimmed.startsWith('###')) {
        const text = trimmed.replace(/^###\s*/, '');
        blocks.push({
          type: 'heading_3',
          heading_3: {
            rich_text: this.parseRichText(text)
          }
        });
      } else if (trimmed.startsWith('##')) {
        const text = trimmed.replace(/^##\s*/, '');
        blocks.push({
          type: 'heading_2',
          heading_2: {
            rich_text: this.parseRichText(text)
          }
        });
      } else if (trimmed.startsWith('#')) {
        const text = trimmed.replace(/^#\s*/, '');
        blocks.push({
          type: 'heading_1',
          heading_1: {
            rich_text: this.parseRichText(text)
          }
        });
      }
      // Handle paragraphs
      else if (trimmed && !trimmed.startsWith('#')) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: this.parseRichText(line || '')
          }
        });
      }
    }

    // Handle unclosed code block
    if (inCodeBlock && codeBlockContent.length > 0) {
      blocks.push({
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: codeBlockContent.join('\n') } }],
          language: codeBlockLanguage || 'plain text'
        }
      });
    }

    return blocks;
  }

  private parseNotionBlocksToTodos(blocks: any[], includeHierarchy: boolean = false, taskTitle?: string): TodoItem[] {
    const todos: TodoItem[] = [];
    let todoIndex = 0;
    let currentHeading: string | null = null;
    let currentLevel = 0;
    let currentContextText: string | null = null;
    let todosInCurrentSection: string[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      // Detect headings
      if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
        if (includeHierarchy) {
          // Reset section context
          currentHeading = this.extractRichText(block[block.type].rich_text);
          currentLevel = parseInt(block.type.split('_')[1]) - 1;
          currentContextText = null;
          todosInCurrentSection = [];
          
          // Look ahead for context paragraph after heading
          if (i + 1 < blocks.length && blocks[i + 1].type === 'paragraph') {
            currentContextText = this.extractRichText(blocks[i + 1].paragraph.rich_text);
          }
        }
      }
      
      // Process todos
      if (block.type === 'to_do') {
        const text = this.extractRichText(block.to_do.rich_text);
        todosInCurrentSection.push(text);
        
        const todoItem: TodoItem = {
          text,
          completed: block.to_do.checked || false,
          level: includeHierarchy ? currentLevel + 1 : 0,
          index: todoIndex++,
          originalLine: `- [${block.to_do.checked ? 'x' : ' '}] ${text}`,
          lineNumber: todoIndex,
          isSubtask: includeHierarchy && currentHeading !== null,
          children: [],
          // Rich context
          heading: includeHierarchy ? (currentHeading || undefined) : undefined,
          headingLevel: includeHierarchy ? currentLevel : undefined,
          contextText: includeHierarchy ? (currentContextText || undefined) : undefined,
          taskTitle: includeHierarchy ? taskTitle : undefined,
          relatedTodos: includeHierarchy ? [...todosInCurrentSection.filter(t => t !== text)] : undefined
        };
        
        // Add heading context if hierarchy is enabled (keeping backward compatibility)
        if (includeHierarchy && currentHeading) {
          todoItem.text = `${currentHeading}: ${text}`;
        }
        
        todos.push(todoItem);
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

  private parseRichText(text: string): any[] {
    if (!text || text.trim() === '') return [];
    
    const richTextElements = [];
    let currentIndex = 0;
    
    // Regex patterns for different formatting
    const patterns = [
      { type: 'bold_italic', regex: /\*\*\*(.*?)\*\*\*/g, annotations: { bold: true, italic: true } },
      { type: 'bold', regex: /\*\*(.*?)\*\*/g, annotations: { bold: true } },
      { type: 'italic', regex: /\*(.*?)\*/g, annotations: { italic: true } },
      { type: 'code', regex: /`(.*?)`/g, annotations: { code: true } }
    ];
    
    // Find all matches and their positions
    const matches = [];
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex.source, 'g');
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1] || '',
          annotations: pattern.annotations,
          type: pattern.type
        });
      }
    }
    
    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);
    
    // Remove overlapping matches (keep the first one)
    const filteredMatches: Array<{
      start: number;
      end: number;
      content: string;
      annotations: any;
      type: string;
    }> = [];
    for (const match of matches) {
      const hasOverlap = filteredMatches.some(existing => 
        (match.start < existing.end && match.end > existing.start)
      );
      if (!hasOverlap) {
        filteredMatches.push(match);
      }
    }
    
    // Build rich text elements
    for (const match of filteredMatches) {
      // Add plain text before the match
      if (currentIndex < match.start) {
        const plainText = text.substring(currentIndex, match.start);
        if (plainText) {
          richTextElements.push({
            type: 'text',
            text: { content: plainText }
          });
        }
      }
      
      // Add formatted text
      richTextElements.push({
        type: 'text',
        text: { content: match.content },
        annotations: match.annotations
      });
      
      currentIndex = match.end;
    }
    
    // Add remaining plain text
    if (currentIndex < text.length) {
      const plainText = text.substring(currentIndex);
      if (plainText) {
        richTextElements.push({
          type: 'text',
          text: { content: plainText }
        });
      }
    }
    
    // If no formatting was found, return simple text
    if (richTextElements.length === 0) {
      return [{ type: 'text', text: { content: text } }];
    }
    
    return richTextElements;
  }

  private extractRichText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    return richText.map(text => text.plain_text || text.text?.content || '').join('');
  }

  private extractTaskTitle(taskResponse: any): string {
    try {
      if (taskResponse.properties?.title?.title) {
        return this.extractRichText(taskResponse.properties.title.title);
      }
      if (taskResponse.properties?.Name?.title) {
        return this.extractRichText(taskResponse.properties.Name.title);
      }
      return 'Untitled Task';
    } catch (error) {
      return 'Untitled Task';
    }
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

  async readPage(pageId: string, includeLinkedPages: boolean = true): Promise<PageContent> {
    try {
      // Get page metadata
      const page = await this.notion.pages.retrieve({ page_id: pageId });
      
      // Get page blocks (content)
      const blocks = await this.notion.blocks.children.list({ 
        block_id: pageId,
        page_size: 100 
      });
      
      // Convert blocks to content
      const content = this.convertBlocksToMarkdown(blocks.results);
      
      // Extract page title
      const title = this.extractPageTitle(page);
      
      // Get linked pages if requested
      let linkedPages: LinkedPage[] = [];
      if (includeLinkedPages) {
        linkedPages = await this.extractLinkedPages(blocks.results);
        
        // Also get child pages if this is a database
        const childPages = await this.getChildPages(pageId);
        linkedPages.push(...childPages);
      }
      
      return {
        id: pageId,
        title,
        url: (page as any).url || '',
        content,
        linkedPages,
        lastEdited: new Date((page as any).last_edited_time),
        createdTime: new Date((page as any).created_time)
      };
    } catch (error) {
      throw new Error(`Failed to read Notion page: ${error}`);
    }
  }

  private extractPageTitle(page: any): string {
    // Try to find title property
    for (const [, property] of Object.entries(page.properties || {})) {
      if ((property as any).type === 'title') {
        return this.extractRichText((property as any).title) || 'Untitled';
      }
    }
    return 'Untitled';
  }

  private convertBlocksToMarkdown(blocks: any[]): string {
    return blocks.map(block => {
      switch (block.type) {
        case 'paragraph':
          return this.extractRichText(block.paragraph.rich_text);
        case 'heading_1':
          return `# ${this.extractRichText(block.heading_1.rich_text)}`;
        case 'heading_2':
          return `## ${this.extractRichText(block.heading_2.rich_text)}`;
        case 'heading_3':
          return `### ${this.extractRichText(block.heading_3.rich_text)}`;
        case 'bulleted_list_item':
          return `- ${this.extractRichText(block.bulleted_list_item.rich_text)}`;
        case 'numbered_list_item':
          return `1. ${this.extractRichText(block.numbered_list_item.rich_text)}`;
        case 'to_do':
          const checked = block.to_do.checked ? '[x]' : '[ ]';
          return `- ${checked} ${this.extractRichText(block.to_do.rich_text)}`;
        case 'code':
          const language = block.code.language || 'text';
          const codeText = this.extractRichText(block.code.rich_text);
          return `\`\`\`${language}\n${codeText}\n\`\`\``;
        case 'quote':
          return `> ${this.extractRichText(block.quote.rich_text)}`;
        default:
          return '';
      }
    }).filter(text => text.length > 0).join('\n\n');
  }

  private async extractLinkedPages(blocks: any[]): Promise<LinkedPage[]> {
    const linkedPages: LinkedPage[] = [];
    const seenPageIds = new Set<string>();

    for (const block of blocks) {
      // Extract mentions from rich text
      const richText = this.getRichTextFromBlock(block);
      if (richText) {
        for (const text of richText) {
          if (text.type === 'mention' && text.mention?.type === 'page') {
            const pageId = text.mention.page.id;
            if (!seenPageIds.has(pageId)) {
              seenPageIds.add(pageId);
              try {
                const linkedPage = await this.notion.pages.retrieve({ page_id: pageId });
                linkedPages.push({
                  id: pageId,
                  title: this.extractPageTitle(linkedPage),
                  url: (linkedPage as any).url || '',
                  relationshipType: 'mention'
                });
              } catch (error) {
                // Skip pages we can't access
              }
            }
          }
        }
      }
    }

    return linkedPages;
  }

  private getRichTextFromBlock(block: any): any[] | null {
    switch (block.type) {
      case 'paragraph':
        return block.paragraph.rich_text;
      case 'heading_1':
        return block.heading_1.rich_text;
      case 'heading_2':
        return block.heading_2.rich_text;
      case 'heading_3':
        return block.heading_3.rich_text;
      case 'bulleted_list_item':
        return block.bulleted_list_item.rich_text;
      case 'numbered_list_item':
        return block.numbered_list_item.rich_text;
      case 'to_do':
        return block.to_do.rich_text;
      case 'quote':
        return block.quote.rich_text;
      default:
        return null;
    }
  }

  private async getChildPages(pageId: string): Promise<LinkedPage[]> {
    try {
      // Try to get child pages (for databases)
      const children = await this.notion.blocks.children.list({
        block_id: pageId,
        page_size: 10
      });

      const childPages: LinkedPage[] = [];

      for (const child of children.results) {
        if ('type' in child && child.type === 'child_page' && 'child_page' in child) {
          try {
            const childPageData = await this.notion.pages.retrieve({ page_id: child.id });
            const childContent = await this.getPageContentSummary(child.id);
            
            childPages.push({
              id: child.id,
              title: child.child_page.title,
              url: `https://notion.so/${child.id.replace(/-/g, '')}`,
              content: childContent,
              relationshipType: 'child'
            });
          } catch (error) {
            // Skip pages we can't access
          }
        }
      }

      // Also check if this is a database and get database entries
      try {
        const database = await this.notion.databases.retrieve({ database_id: pageId });
        if (database) {
          const dbPages = await this.notion.databases.query({ 
            database_id: pageId,
            page_size: 5
          });

          for (const dbPage of dbPages.results) {
            try {
              const pageTitle = this.extractPageTitle(dbPage);
              const pageContent = await this.getPageContentSummary(dbPage.id);
              
              childPages.push({
                id: dbPage.id,
                title: pageTitle,
                url: (dbPage as any).url || '',
                content: pageContent,
                relationshipType: 'child'
              });
            } catch (error) {
              // Skip pages we can't access
            }
          }
        }
      } catch (error) {
        // Not a database, that's fine
      }

      return childPages;
    } catch (error) {
      return [];
    }
  }

  private async getPageContentSummary(pageId: string): Promise<string> {
    try {
      const blocks = await this.notion.blocks.children.list({ 
        block_id: pageId,
        page_size: 20
      });
      
      const content = this.convertBlocksToMarkdown(blocks.results);
      // Return first 300 chars as summary
      return content.substring(0, 300) + (content.length > 300 ? '...' : '');
    } catch (error) {
      return '';
    }
  }
}