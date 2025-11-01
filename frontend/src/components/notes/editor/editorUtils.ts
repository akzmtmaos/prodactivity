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
  
  // First, process inline formatting (bold, italic, etc.)
  let html = text;
  
  // Convert ***bold italic*** to <strong><em> (must be before ** and *)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-semibold"><em class="italic">$1</em></strong>');
  
  // Convert ___bold italic___ to <strong><em> (must be before __ and _)
  html = html.replace(/___(.+?)___/g, '<strong class="font-semibold"><em class="italic">$1</em></strong>');
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  
  // Convert __underline__ to <u>
  html = html.replace(/__(.+?)__/g, '<u class="underline">$1</u>');
  
  // Convert ~~strikethrough~~ to <s>
  html = html.replace(/~~(.+?)~~/g, '<s class="line-through">$1</s>');
  
  // Convert *italic* to <em>
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
  
  // Convert _italic_ to <em> (be careful not to catch underlines in words)
  html = html.replace(/\b_(.+?)_\b/g, '<em class="italic">$1</em>');
  
  // Convert `inline code` to <code>
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  
  // Now split into lines and process block-level elements
  const lines = html.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Empty line
      processedLines.push('<p><br></p>');
      continue;
    }
    
    // Check for headings
    if (line.startsWith('### ')) {
      processedLines.push(`<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4">${line.substring(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      processedLines.push(`<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-5">${line.substring(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      processedLines.push(`<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6">${line.substring(2)}</h1>`);
    }
    // Check for numbered lists
    else if (/^\d+\.\s/.test(line)) {
      processedLines.push(`<li class="ml-4 mb-1">${line}</li>`);
    }
    // Check for bullet lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      processedLines.push(`<li class="ml-4 mb-1 list-disc">${line.substring(2)}</li>`);
    }
    // Regular paragraph
    else {
      processedLines.push(`<p class="mb-2">${line}</p>`);
    }
  }
  
  return processedLines.join('');
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

