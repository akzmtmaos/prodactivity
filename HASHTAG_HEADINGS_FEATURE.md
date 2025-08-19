# Hashtag Headings Feature

## Overview
The Note Document Editor now supports automatic heading conversion using hashtag syntax, similar to Markdown. This feature allows users to quickly create headings by typing hashtags at the beginning of a line.

## How to Use

### Basic Syntax
- `# Heading` → Heading 1 (large, bold)
- `## Heading` → Heading 2 (medium, bold)  
- `### Heading` → Heading 3 (small, bold)

### Features

1. **Real-time Conversion**: As you type hashtags, the editor automatically detects and converts them to headings
2. **Visual Indicators**: When typing hashtags, a blue indicator shows what heading level will be created
3. **Automatic Conversion**: Press Enter to convert a hashtag line to a heading
4. **Revert to Text**: Remove hashtags from a heading to convert it back to normal text
5. **Flexible Syntax**: Works with or without spaces after hashtags

### Examples

```
# Main Title
This is a main heading

## Section Title  
This is a section heading

### Subsection Title
This is a subsection heading

Regular text continues here...
```

### Visual Feedback

- **Blue indicator**: Shows when hashtags are detected
- **Help text**: Displays hashtag syntax in the formatting toolbar
- **Tooltips**: Shows "Press Enter to convert" when hashtags are detected

### Technical Implementation

The feature is implemented in the `BlockEditor` component with the following key functions:

- `processHashtags()`: Detects and processes hashtag patterns
- `getHeadingTypeFromContent()`: Determines heading level from hashtag count
- Real-time input processing in `handleInput()`
- Automatic conversion on Enter key in `handleKeyDown()`

### Supported Patterns

- `# Heading` (with space)
- `## Heading` (with space)  
- `### Heading` (with space)
- `#Heading` (without space)
- `##Heading` (without space)
- `###Heading` (without space)

### Integration

The feature integrates seamlessly with:
- Existing heading formatting options in the toolbar
- Block-based editor architecture
- Auto-save functionality
- Undo/redo operations

This enhancement makes the note editor more intuitive and efficient for users familiar with Markdown syntax while maintaining the rich text editing experience.
