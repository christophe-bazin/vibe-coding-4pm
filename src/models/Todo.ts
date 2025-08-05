/**
 * Todo-related types and interfaces
 */

export interface TodoItem {
  text: string;
  completed: boolean;
  level: number;
  index: number;
  originalLine: string;
  lineNumber: number;
  isSubtask: boolean;
  children: TodoItem[];
  parentId?: string;
  // Rich context for better AI understanding
  heading?: string;
  headingLevel?: number;
  contextText?: string;
  taskTitle?: string;
  relatedTodos?: string[];
}

export interface TodoHierarchy {
  sections: TodoSection[];
  todos: TodoItem[];
  stats: TodoStats;
}

export interface TodoSection {
  title: string;
  level: number;
  todos: TodoItem[];
}

export interface TodoStats {
  total: number;
  completed: number;
  percentage: number;
  nextTodos: string[];
}

export interface TodoUpdateRequest {
  todoText: string;
  completed: boolean;
}

export interface TodoAnalysisResult {
  todos: TodoItem[];
  stats: TodoStats;
  content: string;
  insights: string[];
  recommendations: string[];
  blockers: string[];
}