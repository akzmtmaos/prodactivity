# Note Module Test Cases

## Test Case Document

| Test Case ID | Test Scenario | Test Case | Precondition | Test Steps | Test Data | Expected Result | Post Condition | Actual Result | Status (Pass/Fail) |
|--------------|---------------|-----------|--------------|------------|-----------|-----------------|----------------|---------------|-------------------|
| **NOTE_001** | Notebook Creation | Create a new notebook with valid data | User is authenticated and logged in | 1. Navigate to notebook creation page<br>2. Fill in notebook details<br>3. Select notebook type<br>4. Set urgency level<br>5. Add description<br>6. Click "Create Notebook" | Name: "Study Notes"<br>Type: "study"<br>Urgency: "normal"<br>Description: "Notes for academic studies" | Notebook is created successfully with status 201. Response contains notebook details with generated ID and timestamps | New notebook appears in user's notebook list | | |
| **NOTE_002** | Notebook Creation - Invalid Data | Create notebook with missing required fields | User is authenticated and logged in | 1. Navigate to notebook creation page<br>2. Leave name field empty<br>3. Click "Create Notebook" | Name: ""<br>Type: "study"<br>Urgency: "normal" | API returns 400 error with validation message for missing name field | No notebook is created | | |
| **NOTE_003** | Notebook Creation - Duplicate Name | Create notebook with same name as existing notebook | User has existing notebook named "Study Notes" | 1. Navigate to notebook creation page<br>2. Enter same name as existing notebook<br>3. Fill other required fields<br>4. Click "Create Notebook" | Name: "Study Notes"<br>Type: "work"<br>Urgency: "normal" | API returns 400 error indicating duplicate notebook name | No new notebook is created | | |
| **NOTE_004** | Notebook Retrieval | Get list of user's notebooks | User has multiple notebooks | 1. Send GET request to /api/notes/notebooks/<br>2. Include authentication token | Authentication token in header | API returns 200 with list of all user's notebooks | Notebooks are displayed in UI | | |
| **NOTE_005** | Notebook Retrieval - Archived | Get list of archived notebooks | User has archived notebooks | 1. Send GET request to /api/notes/notebooks/?archived=true<br>2. Include authentication token | Authentication token in header | API returns 200 with list of archived notebooks only | Archived notebooks are displayed | | |
| **NOTE_006** | Notebook Update | Update existing notebook details | User has existing notebook | 1. Navigate to notebook edit page<br>2. Modify notebook details<br>3. Click "Update Notebook" | Name: "Updated Study Notes"<br>Type: "research"<br>Urgency: "important"<br>Description: "Updated description" | Notebook is updated successfully with status 200. Response contains updated details | Notebook details are updated in database | | |
| **NOTE_007** | Notebook Archive | Archive an active notebook | User has active notebook | 1. Navigate to notebook management<br>2. Select notebook to archive<br>3. Click "Archive Notebook" | Notebook ID: 1<br>is_archived: true | Notebook is archived with archived_at timestamp. Status 200 returned | Notebook moves to archived list | | |
| **NOTE_008** | Notebook Unarchive | Unarchive a notebook | User has archived notebook | 1. Navigate to archived notebooks<br>2. Select notebook to unarchive<br>3. Click "Unarchive Notebook" | Notebook ID: 1<br>is_archived: false | Notebook is unarchived with archived_at set to null. Status 200 returned | Notebook moves back to active list | | |
| **NOTE_009** | Notebook Deletion | Delete a notebook | User has notebook with notes | 1. Navigate to notebook management<br>2. Select notebook to delete<br>3. Click "Delete Notebook" | Notebook ID: 1 | Notebook is deleted. All associated notes are soft deleted. Status 204 returned | Notebook and its notes are removed from active lists | | |
| **NOTE_010** | Note Creation | Create a new note with valid data | User has existing notebook | 1. Navigate to note creation page<br>2. Select notebook<br>3. Fill in note details<br>4. Set note type and priority<br>5. Click "Create Note" | Title: "Lecture Notes"<br>Content: "Today's lecture covered..."<br>Notebook: 1<br>Type: "lecture"<br>Priority: "high"<br>Tags: "math, calculus" | Note is created successfully with status 201. Response contains note details with generated ID | New note appears in selected notebook | | |
| **NOTE_011** | Note Creation - Invalid Data | Create note with missing required fields | User has existing notebook | 1. Navigate to note creation page<br>2. Leave title field empty<br>3. Fill other fields<br>4. Click "Create Note" | Title: ""<br>Content: "Some content"<br>Notebook: 1 | API returns 400 error with validation message for missing title | No note is created | | |
| **NOTE_012** | Note Creation - Invalid Notebook | Create note with non-existent notebook | User is authenticated | 1. Navigate to note creation page<br>2. Enter invalid notebook ID<br>3. Fill other required fields<br>4. Click "Create Note" | Title: "Test Note"<br>Content: "Test content"<br>Notebook: 999 | API returns 400 error indicating invalid notebook | No note is created | | |
| **NOTE_013** | Note Retrieval | Get list of user's notes | User has multiple notes | 1. Send GET request to /api/notes/<br>2. Include authentication token | Authentication token in header | API returns 200 with list of all user's notes | Notes are displayed in UI | | |
| **NOTE_014** | Note Retrieval - By Notebook | Get notes filtered by notebook | User has notes in different notebooks | 1. Send GET request to /api/notes/?notebook=1<br>2. Include authentication token | Authentication token in header<br>Notebook ID: 1 | API returns 200 with notes from specified notebook only | Notes from selected notebook are displayed | | |
| **NOTE_015** | Note Retrieval - Archived | Get list of archived notes | User has archived notes | 1. Send GET request to /api/notes/?archived=true<br>2. Include authentication token | Authentication token in header | API returns 200 with list of archived notes only | Archived notes are displayed | | |
| **NOTE_016** | Note Update | Update existing note details | User has existing note | 1. Navigate to note edit page<br>2. Modify note details<br>3. Click "Update Note" | Title: "Updated Lecture Notes"<br>Content: "Updated content..."<br>Priority: "urgent"<br>Tags: "updated, tags" | Note is updated successfully with status 200. Response contains updated details | Note details are updated in database | | |
| **NOTE_017** | Note Archive | Archive an active note | User has active note | 1. Navigate to note management<br>2. Select note to archive<br>3. Click "Archive Note" | Note ID: 1<br>is_archived: true | Note is archived with archived_at timestamp. Status 200 returned | Note moves to archived list | | |
| **NOTE_018** | Note Unarchive | Unarchive a note | User has archived note | 1. Navigate to archived notes<br>2. Select note to unarchive<br>3. Click "Unarchive Note" | Note ID: 1<br>is_archived: false | Note is unarchived with archived_at set to null. Status 200 returned | Note moves back to active list | | |
| **NOTE_019** | Note Soft Delete | Soft delete a note | User has active note | 1. Navigate to note management<br>2. Select note to delete<br>3. Click "Delete Note" | Note ID: 1 | Note is soft deleted with is_deleted=True and deleted_at timestamp. Status 204 returned | Note moves to trash/deleted notes | | |
| **NOTE_020** | Note Hard Delete | Permanently delete a note | User has soft deleted note | 1. Navigate to trash/deleted notes<br>2. Select note to permanently delete<br>3. Click "Permanently Delete" | Note ID: 1 | Note is permanently deleted from database. Status 204 returned | Note is completely removed from system | | |
| **NOTE_021** | Note Search | Search notes by title or content | User has multiple notes with different content | 1. Navigate to search page<br>2. Enter search term<br>3. Click "Search" | Search term: "lecture" | API returns 200 with notes containing "lecture" in title or content | Matching notes are displayed | | |
| **NOTE_022** | Global Search | Search across all notes and notebooks | User has notes and notebooks | 1. Navigate to global search<br>2. Enter search term<br>3. Click "Global Search" | Search term: "study" | API returns 200 with results from both notes and notebooks containing "study" | Mixed results from notes and notebooks are displayed | | |
| **NOTE_023** | Search - No Results | Search with term that doesn't exist | User has notes but none match search term | 1. Navigate to search page<br>2. Enter non-existent term<br>3. Click "Search" | Search term: "xyz123" | API returns 200 with empty results array | No results message is displayed | | |
| **NOTE_024** | Urgent Notes Retrieval | Get all urgent notes and notebooks | User has urgent notes and notebooks | 1. Send GET request to /api/notes/urgent/<br>2. Include authentication token | Authentication token in header | API returns 200 with urgent notes and notebooks | Urgent items are displayed | | |
| **NOTE_025** | Notes by Type | Get notes filtered by type | User has notes of different types | 1. Send GET request to /api/notes/notes-by-type/?type=lecture<br>2. Include authentication token | Authentication token in header<br>Type: "lecture" | API returns 200 with notes of specified type only | Notes of selected type are displayed | | |
| **NOTE_026** | Notebooks by Type | Get notebooks filtered by type | User has notebooks of different types | 1. Send GET request to /api/notes/notebooks-by-type/?type=study<br>2. Include authentication token | Authentication token in header<br>Type: "study" | API returns 200 with notebooks of specified type only | Notebooks of selected type are displayed | | |
| **NOTE_027** | Document Conversion | Convert DOC/DOCX file to text | User has DOC/DOCX file to convert | 1. Navigate to document conversion page<br>2. Upload DOC/DOCX file<br>3. Click "Convert" | File: "document.docx" | API returns 200 with extracted text from document | Converted text is available for note creation | | |
| **NOTE_028** | Document Conversion - Invalid File | Upload non-DOC/DOCX file | User has non-DOC/DOCX file | 1. Navigate to document conversion page<br>2. Upload invalid file type<br>3. Click "Convert" | File: "document.pdf" | API returns 400 error indicating invalid file type | No conversion occurs | | |
| **NOTE_029** | Document Conversion - No File | Submit conversion without file | User is on conversion page | 1. Navigate to document conversion page<br>2. Click "Convert" without uploading file | No file uploaded | API returns 400 error indicating no file provided | No conversion occurs | | |
| **NOTE_030** | Authentication Required | Access notes without authentication | User is not logged in | 1. Send GET request to /api/notes/<br>2. No authentication token | No authentication token | API returns 401 Unauthorized error | Access is denied | | |
| **NOTE_031** | User Isolation | Access another user's notes | User is authenticated | 1. Send GET request to /api/notes/999/<br>2. Include authentication token for different user | Note ID: 999 (belongs to different user)<br>Authentication token for user A | API returns 404 Not Found error | User cannot access other users' notes | | |
| **NOTE_032** | Note Priority Update | Update note priority level | User has existing note | 1. Navigate to note edit page<br>2. Change priority level<br>3. Save changes | Priority: "urgent" | Note priority is updated successfully. Status 200 returned | Note appears in urgent notes list | | |
| **NOTE_033** | Note Urgency Toggle | Toggle note urgency flag | User has existing note | 1. Navigate to note management<br>2. Toggle urgency flag<br>3. Save changes | is_urgent: true | Note urgency is toggled. Status 200 returned | Note appears in urgent notes list | | |
| **NOTE_034** | Notebook Urgency Update | Update notebook urgency level | User has existing notebook | 1. Navigate to notebook edit page<br>2. Change urgency level<br>3. Save changes | Urgency: "critical" | Notebook urgency is updated successfully. Status 200 returned | Notebook appears in urgent notebooks list | | |
| **NOTE_035** | Tags Management | Add and update note tags | User has existing note | 1. Navigate to note edit page<br>2. Add or modify tags<br>3. Save changes | Tags: "important, exam, math" | Note tags are updated successfully. Status 200 returned | Tags are stored and can be used for filtering | | |
| **NOTE_036** | Notes Count | Verify notebook notes count | User has notebook with multiple notes | 1. Create notes in notebook<br>2. Check notebook details | Notebook ID: 1 | Notebook notes_count property returns correct count | Notes count is accurate | | |
| **NOTE_037** | Last Visited Update | Update note last visited timestamp | User opens a note | 1. Navigate to note detail page<br>2. View note content | Note ID: 1 | Note last_visited field is updated with current timestamp | Last visited time is tracked | | |
| **NOTE_038** | Bulk Operations | Archive multiple notes | User has multiple notes selected | 1. Select multiple notes<br>2. Choose archive action<br>3. Confirm bulk operation | Note IDs: [1, 2, 3]<br>Action: "archive" | All selected notes are archived successfully | Multiple notes are archived simultaneously | | |
| **NOTE_039** | Search with Tags | Search notes by tags | User has notes with tags | 1. Navigate to search page<br>2. Search by tag name<br>3. Execute search | Search term: "exam" | API returns notes containing "exam" in tags field | Notes with matching tags are displayed | | |
| **NOTE_040** | Note Type Validation | Create note with invalid type | User is creating note | 1. Navigate to note creation<br>2. Select invalid note type<br>3. Submit form | Type: "invalid_type" | API returns 400 error with validation message | Note creation fails | | |
| **NOTE_041** | Notebook Type Validation | Create notebook with invalid type | User is creating notebook | 1. Navigate to notebook creation<br>2. Select invalid notebook type<br>3. Submit form | Type: "invalid_type" | API returns 400 error with validation message | Notebook creation fails | | |
| **NOTE_042** | Priority Validation | Create note with invalid priority | User is creating note | 1. Navigate to note creation<br>2. Select invalid priority<br>3. Submit form | Priority: "invalid_priority" | API returns 400 error with validation message | Note creation fails | | |
| **NOTE_043** | Urgency Validation | Create notebook with invalid urgency | User is creating notebook | 1. Navigate to notebook creation<br>2. Select invalid urgency level<br>3. Submit form | Urgency: "invalid_urgency" | API returns 400 error with validation message | Notebook creation fails | | |
| **NOTE_044** | Character Limits | Create note with very long content | User is creating note | 1. Navigate to note creation<br>2. Enter very long content<br>3. Submit form | Content: 10,000+ characters | Note is created successfully (no character limit on content) | Long content is stored properly | | |
| **NOTE_045** | Title Length Validation | Create note with very long title | User is creating note | 1. Navigate to note creation<br>2. Enter title exceeding 255 characters<br>3. Submit form | Title: 300+ characters | API returns 400 error indicating title too long | Note creation fails | | |
| **NOTE_046** | Notebook Name Length | Create notebook with very long name | User is creating notebook | 1. Navigate to notebook creation<br>2. Enter name exceeding 255 characters<br>3. Submit form | Name: 300+ characters | API returns 400 error indicating name too long | Notebook creation fails | | |
| **NOTE_047** | Tags Length Validation | Create note with very long tags | User is creating note | 1. Navigate to note creation<br>2. Enter tags exceeding 500 characters<br>3. Submit form | Tags: 600+ characters | API returns 400 error indicating tags too long | Note creation fails | | |
| **NOTE_048** | Deleted Notes Retrieval | Get list of deleted notes | User has deleted notes | 1. Send GET request to /api/notes/archived/notes/<br>2. Include authentication token | Authentication token in header | API returns 200 with list of deleted notes | Deleted notes are displayed in trash | | |
| **NOTE_049** | Restore Deleted Note | Restore a deleted note | User has deleted note | 1. Navigate to trash<br>2. Select note to restore<br>3. Click "Restore Note" | Note ID: 1<br>is_deleted: false | Note is restored with is_deleted=False and deleted_at=null. Status 200 returned | Note moves back to active notes | | |
| **NOTE_050** | Performance Test | Load large number of notes | User has 1000+ notes | 1. Send GET request to /api/notes/<br>2. Measure response time | 1000+ notes in database | API returns results within acceptable time (< 2 seconds) | Large dataset loads efficiently | | |

## Test Environment Setup

### Prerequisites:
- Django backend server running
- Database with test data
- Authentication system configured
- API endpoints accessible

### Test Data Requirements:
- Multiple test users with different permission levels
- Various notebooks with different types and urgency levels
- Notes with different types, priorities, and content
- Archived and deleted items for testing
- Sample DOC/DOCX files for conversion testing

### Test Execution Notes:
- All API tests should include proper authentication headers
- Test both positive and negative scenarios
- Verify proper error handling and status codes
- Test data isolation between users
- Validate all CRUD operations
- Test search and filtering functionality
- Verify archive and delete operations
- Test document conversion features
- Validate AI integration features (if applicable)

### Success Criteria:
- All test cases pass with expected results
- API responses match documented specifications
- Error handling works correctly
- Data integrity is maintained
- Performance meets requirements
- Security measures are enforced
