/**
 * TaskIntelligenceService - Lightweight context provider for AI-driven task creation
 * 
 * This service prepares context and instructions for AI to generate intelligent,
 * contextualized task content. No hardcoded rules - just context preparation.
 */

export interface ProjectContext {
  // Basic project info
  name?: string;
  description?: string;
  language?: string;
  framework?: string;
  
  // File structure context
  files?: string[];
  directories?: string[];
  
  // Code context (if provided)
  codeSnippets?: string[];
  repositoryInfo?: string;
  
  // Current state
  hasTests?: boolean;
  hasLogging?: boolean;
  hasErrorHandling?: boolean;
}

export interface IntelligenceConfig {
  mode: 'simple' | 'contextual' | 'advanced';
  environment: 'desktop' | 'claude-code';
}

export interface ContextualInstruction {
  instruction: string;
  context: {
    task: {
      type: string;
      description: string;
    };
    project: ProjectContext;
    template: string;
  };
  mode: string;
  enhancedContent: string;
}

export class TaskIntelligenceService {
  constructor(private config: IntelligenceConfig) {}

  /**
   * Prepare contextual instruction for AI to generate intelligent task content
   */
  prepareContextualInstruction(
    taskType: string,
    description: string, 
    template: string,
    projectContext?: ProjectContext
  ): ContextualInstruction {
    // If simple mode, just replace basic placeholders and return
    if (this.config.mode === 'simple') {
      const enhancedContent = this.replaceBasicPlaceholders(taskType, description, template);
      return {
        instruction: "Replace basic placeholders only",
        context: {
          task: { type: taskType, description },
          project: projectContext || {},
          template: template
        },
        mode: 'simple',
        enhancedContent
      };
    }

    // For contextual/advanced modes, generate enhanced content with AI instructions
    const enhancedContent = this.generateEnhancedContent(taskType, description, template, projectContext);
    
    return {
      instruction: this.generateIntelligenceInstruction(taskType),
      context: {
        task: { type: taskType, description },
        project: projectContext || {},
        template: template
      },
      mode: this.config.mode,
      enhancedContent
    };
  }

  /**
   * Generate enhanced content with AI instructions embedded in the template
   */
  private generateEnhancedContent(
    taskType: string,
    description: string,
    template: string,
    projectContext?: ProjectContext
  ): string {
    const projectInfo = projectContext ? 
      `Project uses ${projectContext.language || 'unknown language'}, ${projectContext.hasTests ? 'has tests' : 'no tests'}.` : 
      '';
    
    const instruction = `**AI: Based on the task "${description}" and project context (${projectInfo}), follow the workflow template structure below and replace all generic placeholders with specific, actionable content appropriate for this task and project.**`;
    
    return `${instruction}\n\n${template}`;
  }

  /**
   * Generate instruction text for AI based on task type and mode
   */
  private generateIntelligenceInstruction(taskType: string): string {
    const baseInstruction = `Analyze the task description and project context to replace the generic placeholders in the template with specific, actionable content.`;
    
    const taskSpecificGuidance: { [key: string]: string } = {
      'Feature': `For acceptance criteria, focus on what needs to be implemented, tested, and validated. For implementation steps, break down the development process logically.`,
      'Bug': `For reproduction steps, describe how to trigger the issue. For investigation, outline debugging and fix verification steps.`,
      'Refactoring': `For scope, identify affected files/modules. For action plan, describe refactoring approach and validation steps.`
    };

    const contextualGuidance = `Use the project context (language, framework, existing tools) to make suggestions relevant to this specific codebase. Replace generic placeholders like "Criterion 1", "Step 1" with concrete, project-specific tasks.`;

    return `${baseInstruction} ${taskSpecificGuidance[taskType] || ''} ${contextualGuidance}`;
  }

  private replaceBasicPlaceholders(taskType: string, description: string, template: string): string {
    if (taskType === 'Feature') {
      return template.replace(/\[Description of the feature\]/g, description);
    } else if (taskType === 'Bug') {
      return template.replace(/\[Description of the bug\]/g, description);
    } else if (taskType === 'Refactoring') {
      return template.replace(/\[Why this refactoring is necessary\]/g, description);
    }
    return template;
  }
}