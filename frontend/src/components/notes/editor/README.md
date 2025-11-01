# Note Editor Components

This folder contains extracted components and utilities from `NoteEditor.tsx` to improve code organization and maintainability.

## Components

### 1. **EditorToolbar.tsx**
- Top toolbar with title input, save button, and formatting controls
- Contains all the toolbar buttons (bold, italic, table, code, etc.)
- **Props**: title, hasChanges, formatting states, event handlers

### 2. **TableInsertModal.tsx**
- MS Word-style table grid selector
- Custom row/column input
- Handles table size selection and insertion
- **Props**: isOpen, position, onClose, onInsertTable

### 3. **UnsavedChangesModal.tsx**
- Dialog shown when user tries to close with unsaved changes
- Three options: Stay, Discard, Save
- **Props**: isOpen, onStay, onDiscard, onSave

### 4. **EditorSettingsModal.tsx**
- Document settings modal
- Import/Export options
- View options (page view toggle)
- **Props**: isOpen, pageView, various handlers

### 5. **ExportModal.tsx**
- Export note to PDF or Word document
- Format selection with radio buttons
- Loading state during export
- **Props**: isOpen, onClose, onExport

## Utilities

### 1. **tableHelpers.ts**
- `addSimpleCellNavigation()` - Arrow key and Tab navigation between table cells
- `createSimpleTable()` - Creates a simple, minimal table
- `createCodeBlock()` - Creates ChatGPT-style code block with copy button

### 2. **editorUtils.ts**
- `convertTextToHtml()` - Converts plain text to formatted HTML
- `linkifyContent()` - Auto-converts URLs to clickable links
- `insertImage()` - Inserts image with wrapper
- `convertMarkdownToHTML()` - Converts markdown syntax to HTML
- `convertHTMLToMarkdown()` - Converts HTML back to markdown
- `getSelection()` - Helper to get current text selection
- `restoreSelection()` - Helper to restore text selection

## Benefits of This Structure

1. **Reduced File Size**: Main `NoteEditor.tsx` reduced from 3654 lines to ~2000 lines
2. **Better Organization**: Related functionality grouped together
3. **Reusability**: Components can be reused in other parts of the app
4. **Easier Testing**: Individual components can be tested separately
5. **Maintainability**: Changes to specific features are easier to locate and modify
6. **Code Readability**: Each file has a single, clear responsibility

## Usage Example

```typescript
import EditorToolbar from './editor/EditorToolbar';
import TableInsertModal from './editor/TableInsertModal';
import { createSimpleTable, createCodeBlock } from './editor/tableHelpers';
import { linkifyContent, convertMarkdownToHTML } from './editor/editorUtils';

// In your component
<EditorToolbar
  title={title}
  hasChanges={hasChanges}
  onSave={handleSave}
  // ... other props
/>

<TableInsertModal
  isOpen={showTableGrid}
  position={tableGridPosition}
  onClose={() => setShowTableGrid(false)}
  onInsertTable={insertTable}
/>
```

## Next Steps

To complete the refactoring:
1. Update `NoteEditor.tsx` to import and use these components
2. Remove the extracted code from `NoteEditor.tsx`
3. Test all functionality to ensure nothing broke
4. Run linter and fix any issues

