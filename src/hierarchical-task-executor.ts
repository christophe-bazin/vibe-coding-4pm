/**
 * Hierarchical Task Executor - Executes tasks based on Notion document structure
 * Adapted from notion-ai-tasks project for MCP integration
 */

import { Client } from '@notionhq/client';
import { TodoManager } from './todo-manager.js';
import { SimpleProgressTracker } from './simple-progress-tracker.js';

export interface ParsedTodo {
  text: string;
  checked: boolean;
  indent: number;
  isSubtask: boolean;
  children: ParsedTodo[];
}

export interface TaskSection {
  type: 'section';
  title: string;
  level: number;
  todos: ParsedTodo[];
}

export interface TaskStructure {
  sections: TaskSection[];
  todos: ParsedTodo[];
  hierarchy: HierarchyNode[];
}

export interface HierarchyNode {
  type: 'section' | 'todo' | 'subtodo';
  title?: string;
  text?: string;
  checked?: boolean;
  level?: number;
  children: HierarchyNode[];
}

export interface ProgressiveStep {
  message: string;
  todos: Array<{ text: string; checked: boolean; type: string }>;
  type: 'overview' | 'section' | 'subtask' | 'overview_return';
  sectionName?: string;
  taskName?: string;
  parentSection?: string;
  completedSection?: string;
}

export class HierarchicalTaskExecutor {
  private currentLevel = 0;
  private taskStack: any[] = [];
  private contextualMessages = {
    overview: "Here are all the tasks to do",
    working_on: "Working on",
    progress_update: "Progress update", 
    next_section: "Moving on to",
    completed_section: "Section completed"
  };

  constructor(
    private notion: Client,
    private todoManager: TodoManager,
    private tracker: SimpleProgressTracker
  ) {}

  /**
   * Execute task by parsing hierarchical structure and working section by section
   */
  async executeTaskHierarchically(taskId: string): Promise<any> {
    console.log('🎯 Starting hierarchical task execution...');
    
    try {
      // Get all blocks from the Notion page
      console.log('📥 Fetching blocks from Notion...');
      const blocks = await this.notion.blocks.children.list({
        block_id: taskId,
        page_size: 100
      });
      console.log(`📦 Found ${blocks.results.length} blocks`);

      // Parse hierarchical structure
      console.log('🔍 Parsing hierarchical structure...');
      const structure = this.parseHierarchicalContent(blocks.results);
      console.log(`📋 Found ${structure.sections.length} sections with ${structure.todos.length} total todos`);
    
    if (structure.sections.length === 0) {
      throw new Error('No sections found in task');
    }

    // Generate progressive execution plan
    const progressiveSteps = this.generateProgressiveTodos(structure);
    
    console.log('\n📋 Task Structure Overview:');
    structure.sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.title} (${section.todos.length} todos)`);
    });

    // Execute progressive steps and track execution flow for AI context
    let completedSections = 0;
    const results = [];
    const executionFlow = [];

    for (const step of progressiveSteps) {
      console.log(`\n🚀 ${step.message}`);
      
      // Track this step in execution flow for AI context
      const flowStep = {
        message: step.message,
        type: step.type,
        sectionName: step.sectionName,
        todos: step.todos,
        completed: false
      };
      
      if (step.type === 'section') {
        // Execute section todos
        const sectionResult = await this.executeSectionTodos(taskId, step);
        results.push(sectionResult);
        
        // Mark flow step as completed
        flowStep.completed = sectionResult.success;
        
        if (sectionResult.success) {
          completedSections++;
        }
      } else if (step.type === 'overview') {
        // Display overview
        console.log('📊 Task sections:');
        step.todos.forEach(todo => {
          const status = todo.checked ? '✅' : '⏳';
          console.log(`   ${status} ${todo.text}`);
        });
        
        // Mark overview steps as completed (they're informational)
        flowStep.completed = true;
      } else if (step.type === 'subtask') {
        // Handle subtasks if needed
        const subtaskResult = await this.executeSectionTodos(taskId, step);
        results.push(subtaskResult);
        flowStep.completed = subtaskResult.success;
      }
      
      executionFlow.push(flowStep);
    }

    // Update task status based on completion
    const analysis = await this.todoManager.extractTodosFromTask(taskId, false);
    
    try {
      if (analysis.stats.percentage >= 100) {
        await this.tracker.updateTaskStatus(taskId, 'done');
        console.log('\n🎉 Task completed successfully!');
      } else if (analysis.stats.percentage > 0) {
        await this.tracker.updateTaskStatus(taskId, 'inProgress');
        console.log('\n📈 Task in progress...');
      }
    } catch (error) {
      // If workflow state not found, just continue without status update
      console.log(`\n⚠️  Could not update task status: ${error}`);
    }

    console.log('✅ Hierarchical execution completed successfully!');
    return {
      success: true,
      sectionsExecuted: completedSections,
      totalSections: structure.sections.length,
      finalStats: analysis.stats,
      results,
      executionFlow
    };
    } catch (error) {
      console.error('❌ Hierarchical execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute the next uncompleted section, showing detailed progress
   */
  async executeNextSection(taskId: string): Promise<any> {
    try {
      // Get all blocks and parse structure
      const blocks = await this.notion.blocks.children.list({
        block_id: taskId,
        page_size: 100
      });

      const structure = this.parseHierarchicalContent(blocks.results);
      
      if (structure.sections.length === 0) {
        throw new Error('No sections found in task');
      }

      // Find the first uncompleted section
      let targetSection = null;
      let sectionIndex = -1;
      
      for (let i = 0; i < structure.sections.length; i++) {
        const section = structure.sections[i];
        if (section && section.todos) {
          const uncompletedTodos = section.todos.filter(todo => !todo.checked);
          
          if (uncompletedTodos.length > 0) {
            targetSection = section;
            sectionIndex = i;
            break;
          }
        }
      }

      if (!targetSection) {
        // No uncompleted sections found
        const analysis = await this.todoManager.extractTodosFromTask(taskId, false);
        return {
          completed: false,
          finalStats: analysis.stats
        };
      }

      console.log(`🚀 Executing section: ${targetSection.title}`);
      console.log(`📝 Processing ${targetSection.todos.length} todos...`);

      // Execute todos in this section
      let completedInSection = 0;
      const sectionTodos = [];

      for (const todo of targetSection.todos) {
        console.log(`   ${todo.checked ? '✅' : '⏳'} ${todo.text}`);
        
        if (!todo.checked) {
          try {
            await this.todoManager.updateTodo(taskId, todo.text, true);
            console.log(`   ✅ Completed: ${todo.text}`);
            completedInSection++;
            sectionTodos.push({ text: todo.text, completed: true });
          } catch (error) {
            console.log(`   ❌ Failed: ${todo.text} - ${error}`);
            sectionTodos.push({ text: todo.text, completed: false });
          }
        } else {
          sectionTodos.push({ text: todo.text, completed: true });
          completedInSection++;
        }
      }

      // Get updated task stats
      const analysis = await this.todoManager.extractTodosFromTask(taskId, false);

      // Check if there are more sections
      const hasMoreSections = sectionIndex < structure.sections.length - 1;
      const nextSectionName = hasMoreSections ? structure.sections[sectionIndex + 1]?.title : null;

      console.log(`✅ Section "${targetSection.title}" completed: ${completedInSection}/${targetSection.todos.length} todos`);

      return {
        completed: true,
        sectionName: targetSection.title,
        currentSectionIndex: sectionIndex,
        totalSections: structure.sections.length,
        completedTodos: completedInSection,
        totalTodos: targetSection.todos.length,
        todos: sectionTodos,
        finalStats: analysis.stats,
        hasMoreSections,
        nextSectionName
      };

    } catch (error) {
      console.error('❌ Execute next section failed:', error);
      throw error;
    }
  }

  /**
   * Execute todos in a specific section
   */
  private async executeSectionTodos(taskId: string, step: ProgressiveStep): Promise<any> {
    console.log(`📝 Processing section: ${step.sectionName}`);
    
    let completed = 0;
    const total = step.todos.length;
    
    for (const todo of step.todos) {
      if (!todo.checked) {
        console.log(`   ⏳ Working on: ${todo.text}`);
        
        try {
          // Mark todo as completed
          await this.todoManager.updateTodo(taskId, todo.text, true);
          completed++;
          console.log(`   ✅ Completed: ${todo.text}`);
        } catch (error) {
          console.log(`   ❌ Failed: ${todo.text} - ${error}`);
        }
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        completed++;
      }
    }
    
    console.log(`✅ Section "${step.sectionName}" completed: ${completed}/${total} todos`);
    
    return {
      success: completed === total,
      sectionName: step.sectionName,
      completed,
      total
    };
  }

  /**
   * Parse Notion blocks into hierarchical structure
   */
  parseHierarchicalContent(content: any[]): TaskStructure {
    const structure: TaskStructure = {
      sections: [],
      todos: [],
      hierarchy: []
    };

    if (!content || !Array.isArray(content)) {
      return structure;
    }

    let currentSection: TaskSection | null = null;
    let currentTodos: ParsedTodo[] = [];
    let recentHeadingDistance = 0;

    for (const block of content) {
      if (this.isHeading(block)) {
        // Save previous section
        if (currentSection) {
          structure.sections.push({
            ...currentSection,
            todos: [...currentTodos]
          });
          currentTodos = [];
        }
        
        currentSection = {
          type: 'section',
          title: this.extractText(block),
          level: this.getHeadingLevel(block),
          todos: []
        };
        recentHeadingDistance = 0;
      } else if (this.isTodo(block)) {
        recentHeadingDistance++;
        const todo = this.parseTodoWithChildren(block, 0);
        
        // Create virtual sections for todos with children
        const shouldCreateVirtualSection = todo.children && todo.children.length > 0 && 
          (recentHeadingDistance > 2 || 
           (currentSection && currentSection.title === "Section 1" && currentTodos.length >= 2));
        
        if (shouldCreateVirtualSection) {
          // Save current section if exists
          if (currentSection) {
            structure.sections.push({
              ...currentSection,
              todos: [...currentTodos]
            });
            currentTodos = [];
          }
          
          // Create virtual section from this todo
          currentSection = {
            type: 'section',
            title: todo.text,
            level: 2,
            todos: []
          };
          
          // Add children as todos in this section
          for (const child of todo.children) {
            currentTodos.push(child);
            this.flattenTodos(child, structure.todos);
          }
          recentHeadingDistance = 0;
        } else {
          // Regular todo - add to current section
          currentTodos.push(todo);
          this.flattenTodos(todo, structure.todos);
        }
      }
    }

    // Handle remaining section or create default section
    if (currentSection) {
      structure.sections.push({
        ...currentSection,
        todos: [...currentTodos]
      });
    } else if (currentTodos.length > 0) {
      structure.sections.push({
        type: 'section',
        title: 'Main Tasks',
        level: 1,
        todos: [...currentTodos]
      });
    }

    structure.hierarchy = this.buildHierarchy(structure);
    return structure;
  }

  private parseTodoWithChildren(block: any, indentLevel: number): ParsedTodo {
    const todo: ParsedTodo = {
      text: this.extractText(block).trim(),
      checked: this.isChecked(block),
      indent: indentLevel,
      isSubtask: indentLevel > 0,
      children: []
    };

    // Parse children if they exist
    if (block.children && Array.isArray(block.children)) {
      for (const child of block.children) {
        if (this.isTodo(child)) {
          const childTodo = this.parseTodoWithChildren(child, indentLevel + 1);
          todo.children.push(childTodo);
        }
      }
    }

    return todo;
  }

  private flattenTodos(todo: ParsedTodo, flatList: ParsedTodo[]): void {
    flatList.push({
      text: todo.text,
      checked: todo.checked,
      indent: todo.indent,
      isSubtask: todo.isSubtask,
      children: []
    });
    
    if (todo.children) {
      for (const child of todo.children) {
        this.flattenTodos(child, flatList);
      }
    }
  }

  private buildHierarchy(structure: TaskStructure): HierarchyNode[] {
    const hierarchy: HierarchyNode[] = [];
    
    for (const section of structure.sections) {
      const hierarchyNode: HierarchyNode = {
        type: 'section',
        title: section.title,
        level: section.level,
        children: []
      };

      for (const todo of section.todos) {
        const todoNode = this.buildTodoNode(todo);
        hierarchyNode.children.push(todoNode);
      }
      
      hierarchy.push(hierarchyNode);
    }

    return hierarchy;
  }

  private buildTodoNode(todo: ParsedTodo): HierarchyNode {
    const todoNode: HierarchyNode = {
      type: 'todo',
      text: todo.text,
      checked: todo.checked,
      children: []
    };

    if (todo.children && Array.isArray(todo.children)) {
      for (const child of todo.children) {
        const childNode = this.buildTodoNode(child);
        childNode.type = 'subtodo';
        todoNode.children.push(childNode);
      }
    }

    return todoNode;
  }

  generateProgressiveTodos(structure: TaskStructure): ProgressiveStep[] {
    const messages = this.contextualMessages;
    const progressiveSteps: ProgressiveStep[] = [];

    const topLevelTodos = structure.hierarchy.map(section => ({
      text: section.title || '',
      checked: false,
      type: 'section'
    }));

    if (topLevelTodos.length > 0) {
      progressiveSteps.push({
        message: messages.overview,
        todos: topLevelTodos,
        type: 'overview'
      });
    }

    for (let i = 0; i < structure.hierarchy.length; i++) {
      const section = structure.hierarchy[i];
      if (!section) continue;
      
      if (section.children.length > 0) {
        const sectionTodos = section.children.map(child => ({
          text: child.text || '',
          checked: child.checked || false,
          type: 'todo'
        }));

        // Step: Work on section
        progressiveSteps.push({
          message: `${messages.working_on} "${section.title}"`,
          todos: sectionTodos,
          type: 'section',
          sectionName: section.title
        });

        // Handle nested todos with children
        for (const todo of section.children) {
          if (todo.children && todo.children.length > 0) {
            const subtodos = todo.children.map(subtodo => ({
              text: subtodo.text || '',
              checked: subtodo.checked || false,
              type: 'subtodo'
            }));

            progressiveSteps.push({
              message: `${messages.working_on} "${todo.text}"`,
              todos: subtodos,
              type: 'subtask',
              parentSection: section.title,
              taskName: todo.text
            });
          }
        }

        // Step: Return to overview with section completed
        const updatedOverview = topLevelTodos.map(todo => ({
          ...todo,
          checked: structure.hierarchy.slice(0, i + 1).some(s => s.title === todo.text)
        }));

        progressiveSteps.push({
          message: `${messages.completed_section} "${section.title}"`,
          todos: updatedOverview,
          type: 'overview_return',
          completedSection: section.title
        });
      }
    }

    return progressiveSteps;
  }

  private isHeading(block: any): boolean {
    return block.type && block.type.startsWith('heading_');
  }

  private isTodo(block: any): boolean {
    return block.type === 'to_do';
  }

  private isChecked(block: any): boolean {
    return block.to_do?.checked || false;
  }

  private getHeadingLevel(block: any): number {
    if (block.type === 'heading_1') return 1;
    if (block.type === 'heading_2') return 2;
    if (block.type === 'heading_3') return 3;
    return 1;
  }

  private extractText(block: any): string {
    if (block.type === 'to_do') {
      return block.to_do?.rich_text?.[0]?.plain_text || '';
    }
    if (block.type.startsWith('heading_')) {
      const headingType = block.type;
      return block[headingType]?.rich_text?.[0]?.plain_text || '';
    }
    return '';
  }
}