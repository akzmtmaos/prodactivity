// frontend/src/components/notes/editor/editorUtils.ts

// Function to convert text to HTML with formatting detection
export const convertTextToHtml = (text: string): string => {
  const lines = text.split('\n');
  const htmlLines: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push('<br>');
      continue;
    }
    
    // Detect bullet points (various formats)
    if (line.match(/^[\•\*\-\+]\s/) || line.match(/^\d+\.\s/)) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      const listItem = line.replace(/^[\•\*\-\+]\s/, '').replace(/^\d+\.\s/, '');
      htmlLines.push(`<li>${listItem}</li>`);
    }
    // Detect table-like content (lines with multiple spaces or tabs)
    else if (line.includes('\t') || (line.split(/\s{2,}/).length > 2)) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      // Convert tab-separated or space-separated content to table
      const cells = line.split(/\t|\s{2,}/).filter(cell => cell.trim());
      if (cells.length > 1) {
        htmlLines.push('<table class="notion-table"><tr>');
        cells.forEach(cell => {
          htmlLines.push(`<td>${cell.trim()}</td>`);
        });
        htmlLines.push('</tr></table>');
      } else {
        htmlLines.push(`<p>${line}</p>`);
      }
    }
    // Regular paragraph
    else {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<p>${line}</p>`);
    }
  }
  
  if (inList) {
    htmlLines.push('</ul>');
  }
  
  return htmlLines.join('\n');
};

// Auto-linkify URLs in the editor
export const linkifyContent = (contentEditableRef: React.RefObject<HTMLDivElement | null>) => {
  if (!contentEditableRef.current) return;
  
  const selection = window.getSelection();
  const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  
  // URL pattern
  const urlPattern = /(?<!href=["'])(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
  
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const text = node.textContent;
      const matches = text.match(urlPattern);
      
      if (matches && matches.length > 0) {
        const parent = node.parentNode;
        if (parent && parent.nodeName !== 'A') { // Don't linkify if already in a link
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          
          matches.forEach(url => {
            const index = text.indexOf(url, lastIndex);
            
            // Add text before URL
            if (index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
            }
            
            // Create link
            const link = document.createElement('a');
            const href = url.startsWith('http') ? url : `https://${url}`;
            link.href = href;
            link.textContent = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.color = '#3b82f6';
            link.style.textDecoration = 'underline';
            link.className = 'auto-link';
            fragment.appendChild(link);
            
            lastIndex = index + url.length;
          });
          
          // Add remaining text
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          }
          
          parent.replaceChild(fragment, node);
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'A') {
      // Process child nodes
      Array.from(node.childNodes).forEach(child => processNode(child));
    }
  };
  
  processNode(contentEditableRef.current);
  
  // Restore cursor
  if (savedRange) {
    try {
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
    } catch (e) {
      // Cursor restoration failed, place at end
      contentEditableRef.current.focus();
    }
  }
};

// Insert image
export const insertImage = (imageUrl: string, contentEditableRef: React.RefObject<HTMLDivElement | null>) => {
  const selection = window.getSelection();
  if (!selection || !contentEditableRef.current) return;

  const range = selection.getRangeAt(0);
  const img = document.createElement('img');
  img.src = imageUrl;
  img.className = 'note-image';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  img.style.margin = '8px 0';
  img.style.cursor = 'pointer';
  
  // Add image wrapper for resizing
  const wrapper = document.createElement('div');
  wrapper.className = 'image-wrapper';
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  wrapper.style.margin = '8px 0';
  wrapper.appendChild(img);
  
  // Insert the image
  range.deleteContents();
  range.insertNode(wrapper);
  
  // Move cursor after the image
  range.setStartAfter(wrapper);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
  
  return wrapper;
};

// Convert markdown to HTML
export const convertMarkdownToHTML = (text: string): string => {
  if (!text) return '';
  
  return text
    // Convert ### headings to h3
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4">$1</h3>')
    // Convert ## headings to h2
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-5">$1</h2>')
    // Convert # headings to h1
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6">$1</h1>')
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Convert numbered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1">$1. $2</li>')
    // Convert bullet lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 mb-1 list-disc">$1</li>')
    // Convert line breaks
    .replace(/\n/g, '<br>');
};

// Convert HTML back to markdown for storage
export const convertHTMLToMarkdown = (html: string): string => {
  if (!html) return '';
  
  return html
    // Convert h3 back to ###
    .replace(/<h3[^>]*>(.+?)<\/h3>/g, '### $1')
    // Convert h2 back to ##
    .replace(/<h2[^>]*>(.+?)<\/h2>/g, '## $1')
    // Convert h1 back to #
    .replace(/<h1[^>]*>(.+?)<\/h1>/g, '# $1')
    // Convert <strong> back to **
    .replace(/<strong[^>]*>(.+?)<\/strong>/g, '**$1**')
    // Convert <em> back to *
    .replace(/<em[^>]*>(.+?)<\/em>/g, '*$1*')
    // Convert <hr> back to dashes
    .replace(/<hr[^>]*>/g, '\n---\n')
    // Convert <br> back to \n
    .replace(/<br\s*\/?>/g, '\n')
    // Remove other HTML tags
    .replace(/<[^>]*>/g, '');
};

// Helper function to get current selection
export const getSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  return selection.getRangeAt(0);
};

// Helper function to restore selection
export const restoreSelection = (range: Range) => {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

