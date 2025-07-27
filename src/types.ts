/**
 * Simple types for the Notion Workflow MCP server
 */

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  children?: TodoItem[];
}

export interface NotionTask {
  id: string;
  url: string;
  title: string;
  status: string;
  content: string;
  todos: TodoItem[];
}

export interface NotionUrlInfo {
  pageId: string;
  originalUrl: string;
  isValid: boolean;
}