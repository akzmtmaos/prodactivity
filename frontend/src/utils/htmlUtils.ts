/**
 * Utility functions for handling HTML content
 */

/**
 * Strips HTML tags from content and decodes common HTML entities
 * @param htmlContent - The HTML content to clean
 * @returns Clean text content without HTML tags
 */
export const stripHtmlTags = (htmlContent: string): string => {
  if (!htmlContent) return '';
  
  // Remove HTML tags and decode common HTML entities
  return htmlContent
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

/**
 * Safely truncates HTML content to a specified length after stripping tags
 * @param htmlContent - The HTML content to truncate
 * @param maxLength - Maximum length of the truncated text
 * @param suffix - Suffix to add if content is truncated (default: '...')
 * @returns Truncated clean text
 */
export const truncateHtmlContent = (
  htmlContent: string, 
  maxLength: number, 
  suffix: string = '...'
): string => {
  const cleanContent = stripHtmlTags(htmlContent);
  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }
  return cleanContent.substring(0, maxLength) + suffix;
};
