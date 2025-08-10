/**
 * Page-related types and interfaces for Notion page reading
 */

export interface PageContent {
  id: string;
  title: string;
  url: string;
  content: string;
  linkedPages?: LinkedPage[];
  lastEdited: Date;
  createdTime: Date;
}

export interface LinkedPage {
  id: string;
  title: string;
  url: string;
  content?: string;
  relationshipType: 'mention' | 'relation' | 'child';
}

export interface NotionBlock {
  id: string;
  type: string;
  content: string;
  hasChildren: boolean;
  children?: NotionBlock[];
}