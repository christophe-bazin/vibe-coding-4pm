/**
 * Utility functions for Notion URL parsing and validation
 */

import { NotionUrlInfo } from './types.js';

/**
 * Extracts Notion page ID from various URL formats
 * Supports:
 * - https://www.notion.so/...?p=abc123
 * - https://www.notion.so/.../abc123
 * - Standard Notion URLs with page IDs
 */
export function parseNotionUrl(url: string): NotionUrlInfo {
  const result: NotionUrlInfo = {
    pageId: '',
    originalUrl: url,
    isValid: false
  };

  try {
    const urlObj = new URL(url);
    
    // Check if it's a Notion domain
    if (!urlObj.hostname.includes('notion.so')) {
      return result;
    }

    // Extract from query parameter ?p=
    const pageIdFromQuery = urlObj.searchParams.get('p');
    if (pageIdFromQuery) {
      result.pageId = normalizePageId(pageIdFromQuery);
      result.isValid = isValidPageId(result.pageId);
      return result;
    }

    // Extract from pathname - get the last segment that looks like a page ID
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      const segment = pathSegments[i];
      if (segment && segment.length >= 32) {
        const normalizedId = normalizePageId(segment);
        if (isValidPageId(normalizedId)) {
          result.pageId = normalizedId;
          result.isValid = true;
          return result;
        }
      }
    }

    return result;
  } catch (error) {
    return result;
  }
}

/**
 * Normalizes a page ID by removing dashes and ensuring proper format
 */
export function normalizePageId(pageId: string): string {
  // Remove dashes and keep only alphanumeric characters
  const cleaned = pageId.replace(/[-\s]/g, '');
  
  // Ensure it's exactly 32 characters
  if (cleaned.length === 32) {
    return cleaned;
  }
  
  // If it's longer, try to extract the last 32 characters
  if (cleaned.length > 32) {
    return cleaned.slice(-32);
  }
  
  return cleaned;
}

/**
 * Validates if a string is a valid Notion page ID
 */
export function isValidPageId(pageId: string): boolean {
  // Should be exactly 32 alphanumeric characters
  return /^[a-f0-9]{32}$/i.test(pageId);
}

/**
 * Formats a page ID with dashes for display purposes
 */
export function formatPageIdWithDashes(pageId: string): string {
  if (pageId.length !== 32) {
    return pageId;
  }
  
  return `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;
}

/**
 * Creates a standard Notion URL from a page ID
 */
export function createNotionUrl(pageId: string): string {
  const formattedId = formatPageIdWithDashes(pageId);
  return `https://www.notion.so/${formattedId}`;
}