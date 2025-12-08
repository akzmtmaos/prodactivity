import { getApiBaseUrl } from '../../config/api';
import { Attachment } from './types';

/**
 * Utility function to construct proper avatar URL from various formats
 */
export const getAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  
  // If it's already a full URL (starts with http:// or https://), return as is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // If it's a relative path starting with /, construct full URL
  if (avatar.startsWith('/')) {
    const apiBaseUrl = getApiBaseUrl();
    // Remove /api from the base URL to get backend base URL
    const backendBaseUrl = apiBaseUrl.replace('/api', '');
    return `${backendBaseUrl}${avatar}`;
  }
  
  // If it's just a filename, construct URL with /media/avatars/ prefix
  const apiBaseUrl = getApiBaseUrl();
  const backendBaseUrl = apiBaseUrl.replace('/api', '');
  return `${backendBaseUrl}/media/avatars/${avatar}`;
};

/**
 * Formats a message preview for display in chat list
 * Handles attachments and shared items, returns user-friendly text
 */
export const formatMessagePreview = (content: string | null | undefined): string => {
  if (!content) return '';
  
  // Check for shared items first
  const sharedMatch = content.match(/__SHARED_ITEM__([\s\S]+)$/);
  if (sharedMatch && sharedMatch[1]) {
    try {
      const sharedData = JSON.parse(sharedMatch[1].trim());
      const itemType = sharedData.itemType || 'item';
      const itemTitle = sharedData.itemTitle || 'item';
      
      // Get icon based on item type
      const icons: Record<string, string> = {
        'note': '📝',
        'notebook': '📔',
        'reviewer': '📚',
        'task': '✅'
      };
      const icon = icons[itemType] || '📄';
      
      // Check if there's additional text content
      const text = content.replace(/__SHARED_ITEM__[\s\S]+$/, '').trim();
      if (text) {
        return `${text} • ${icon} Shared ${itemType}`;
      }
      
      return `${icon} Shared ${itemType}: ${itemTitle}`;
    } catch (e) {
      // If parsing fails, continue to check for attachments
      console.error('❌ Error parsing shared item in preview:', e);
    }
  }
  
  // Check if content contains attachments - use [\s\S] to match newlines
  const attachmentsMatch = content.match(/__ATTACHMENTS__([\s\S]+)$/);
  if (attachmentsMatch && attachmentsMatch[1]) {
    try {
      const attachmentsJson = attachmentsMatch[1].trim();
      const attachments = JSON.parse(attachmentsJson) as Attachment[];
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const text = content.replace(/__ATTACHMENTS__[\s\S]+$/, '').trim();
        const imageCount = attachments.filter(a => a.type === 'image').length;
        const fileCount = attachments.filter(a => a.type === 'file').length;
        
        console.log('📋 Formatting preview:', { total: attachments.length, images: imageCount, files: fileCount });
        
        // Build preview message
        const parts: string[] = [];
        if (text) {
          parts.push(text);
        }
        
        if (imageCount > 0 && fileCount > 0) {
          parts.push(`📎 ${imageCount} image${imageCount > 1 ? 's' : ''}, ${fileCount} file${fileCount > 1 ? 's' : ''}`);
        } else if (imageCount > 0) {
          parts.push(`🖼️ ${imageCount} image${imageCount > 1 ? 's' : ''}`);
        } else if (fileCount > 0) {
          parts.push(`📎 ${fileCount} file${fileCount > 1 ? 's' : ''}`);
        }
        
        return parts.join(' • ') || 'Sent an attachment';
      }
    } catch (e) {
      // If parsing fails, return content as-is
      console.error('❌ Error parsing attachments in preview:', e, 'Content preview:', content.substring(0, 200));
    }
  }
  
  // Return plain text, removing both shared items and attachments markers
  return content
    .replace(/__SHARED_ITEM__[\s\S]+$/, '')
    .replace(/__ATTACHMENTS__[\s\S]+$/, '')
    .trim();
};

