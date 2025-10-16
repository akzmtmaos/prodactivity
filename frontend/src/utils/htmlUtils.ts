// HTML utility functions

export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Get text content (strips all HTML tags)
  return temp.textContent || temp.innerText || '';
};

export const truncateHtmlContent = (html: string, maxLength: number = 150): string => {
  if (!html) return '';
  
  // Strip HTML tags first
  const text = stripHtmlTags(html);
  
  // Truncate to max length
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
};

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  
  // Basic sanitization - remove script tags and potentially dangerous content
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove inline event handlers
  
  return cleaned;
};

