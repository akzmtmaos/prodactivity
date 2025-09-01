# Deck Module Test Cases

## Test Case Template Structure
- **Test Scenario**
- **Test Case**
- **Prediction**
- **Test Steps**
- **Test Data**
- **Expected Result**
- **Post Condition**
- **Actual Result**

---

## 1) Deck CRUD

### 1.1 Create Deck (Top-level)
- **Test Scenario**: Create a new top-level deck with valid data
- **Test Case**: TC_DECK_001 - Create deck OK
- **Prediction**: Deck is created and returned with metadata
- **Test Steps**:
  1. Authenticate as user A (obtain JWT access token)
  2. POST `POST /api/decks/decks/` with body `{ "title": "Biology" }`
- **Test Data**: Title=`Biology`
- **Expected Result**:
  - 201 Created, body contains: `id`, `title`, `created_at`, `updated_at`, `flashcard_count=0`, `subdecks=[]`, `flashcards=[]`, `progress=0`, `is_deleted=false`
  - `user` is set to the authenticated user
- **Post Condition**: Deck exists for user A

### 1.2 Create Subdeck (Child deck)
- **Test Scenario**: Create a subdeck under a parent deck
- **Test Case**: TC_DECK_002 - Create subdeck OK
- **Prediction**: Subdeck created and appears in parent deck's `subdecks`
- **Test Steps**:
  1. Ensure parent deck exists (e.g., id=10)
  2. POST `/api/decks/decks/` with `{ "title": "Genetics", "parent": 10 }`
- **Test Data**: Title=`Genetics`, Parent=`10`
- **Expected Result**:
  - 201 Created with new deck `id` and `parent=10`
- **Post Condition**: Subdeck exists and is returned from `GET /api/decks/decks/?parent=10`

### 1.3 Get Deck Detail
- **Test Scenario**: Retrieve deck by id
- **Test Case**: TC_DECK_003 - Get deck detail OK
- **Prediction**: Returns deck with nested `flashcards` and `subdecks`
- **Test Steps**: `GET /api/decks/decks/{id}/`
- **Test Data**: id of an existing deck
- **Expected Result**: 200 OK with full deck object
- **Post Condition**: None

### 1.4 Update Deck Title
- **Test Scenario**: Update a deck's title
- **Test Case**: TC_DECK_004 - Update deck OK
- **Prediction**: Title updated; `updated_at` changes
- **Test Steps**: `PATCH /api/decks/decks/{id}/` body `{ "title": "Biology 101" }`
- **Test Data**: New title
- **Expected Result**: 200 OK with updated fields
- **Post Condition**: Deck title changed in DB

### 1.5 Duplicate Title Prevention per Parent
- **Test Scenario**: Unique constraint on `title,user,parent`
- **Test Case**: TC_DECK_005 - Duplicate title in same parent
- **Prediction**: Creation fails when duplicate under same parent
- **Test Steps**:
  1. Ensure deck `Biology` exists (parent null)
  2. POST `/api/decks/decks/` body `{ "title": "Biology" }`
- **Test Data**: Title=`Biology`
- **Expected Result**: 400 Bad Request (unique constraint violation)
- **Post Condition**: No new deck created

### 1.6 List Decks (Top-level, Active)
- **Test Scenario**: List active (non-archived, non-deleted) decks
- **Test Case**: TC_DECK_006 - List decks OK
- **Prediction**: Paginated list with PAGE_SIZE=10
- **Test Steps**: `GET /api/decks/decks/`
- **Test Data**: None
- **Expected Result**: 200 OK; `results` array length ≤ 10; no `is_deleted=true` records
- **Post Condition**: None

### 1.7 List Subdecks by Parent Filter
- **Test Scenario**: Filter decks by `parent`
- **Test Case**: TC_DECK_007 - Filter by parent OK
- **Prediction**: Returns only subdecks of given parent
- **Test Steps**: `GET /api/decks/decks/?parent={parentId}`
- **Test Data**: parentId of existing deck
- **Expected Result**: 200 OK; only children of parent
- **Post Condition**: None

### 1.8 Soft Delete Deck
- **Test Scenario**: Soft delete a deck (first DELETE)
- **Test Case**: TC_DECK_008 - Soft delete OK
- **Prediction**: `is_deleted=true` and `deleted_at` set; 204 No Content
- **Test Steps**: `DELETE /api/decks/decks/{id}/`
- **Test Data**: Existing deck id
- **Expected Result**: 204; subsequent `GET /api/decks/decks/` excludes it
- **Post Condition**: Deck marked deleted; not listed in active

### 1.9 Permanent Delete on Second DELETE
- **Test Scenario**: Permanently delete after already soft-deleted
- **Test Case**: TC_DECK_009 - Hard delete OK
- **Prediction**: Record removed from DB
- **Test Steps**:
  1. Ensure deck has `is_deleted=true`
  2. `DELETE /api/decks/decks/{id}/` again
- **Test Data**: Deck id
- **Expected Result**: 204; `GET /api/decks/decks/{id}/` returns 404
- **Post Condition**: Deck removed

### 1.10 Archive/Unarchive Deck
- **Test Scenario**: Toggle `is_archived` via PATCH
- **Test Case**: TC_DECK_010 - Archive toggle OK
- **Prediction**: Deck moves between active and archived lists
- **Test Steps**:
  - Archive: `PATCH /api/decks/decks/{id}/` body `{ "is_archived": true }`
  - Unarchive: same with `false`
- **Test Data**: Deck id
- **Expected Result**:
  - `archived_at` set when archived; cleared when unarchived
  - Appears in `GET /api/decks/archived/decks/` when archived
- **Post Condition**: Archive state updated

### 1.11 Access Control: Other User's Deck
- **Test Scenario**: User B tries to access user A's deck
- **Test Case**: TC_DECK_011 - Ownership enforced
- **Prediction**: 404 Not Found for non-owned deck
- **Test Steps**: Auth as user B → `GET /api/decks/decks/{idOfUserA}`
- **Test Data**: Deck id owned by user A
- **Expected Result**: 404
- **Post Condition**: None

---

## 2) Flashcards

### 2.1 Create Flashcard
- **Test Scenario**: Create flashcard for owned deck
- **Test Case**: TC_FC_001 - Create flashcard OK
- **Prediction**: Flashcard created and linked to deck
- **Test Steps**: `POST /api/decks/flashcards/` body `{ "deck": deckId, "front": "Q", "back": "A" }`
- **Test Data**: Valid deckId, strings for front/back
- **Expected Result**: 201 Created, `user` auto-set to requester
- **Post Condition**: Flashcard exists; deck `flashcard_count` increases on next fetch

### 2.2 List Flashcards (By Deck)
- **Test Scenario**: Filter flashcards for a given deck
- **Test Case**: TC_FC_002 - List by deck OK
- **Prediction**: Returns only flashcards in deck
- **Test Steps**: `GET /api/decks/flashcards/?deck={deckId}`
- **Test Data**: deckId
- **Expected Result**: 200 OK; only flashcards for deckId
- **Post Condition**: None

### 2.3 Update Flashcard
- **Test Scenario**: Update flashcard content
- **Test Case**: TC_FC_003 - Update OK
- **Prediction**: Front/back updated
- **Test Steps**: `PATCH /api/decks/flashcards/{id}/` with updated fields
- **Test Data**: New `front`, `back`
- **Expected Result**: 200 OK, fields changed
- **Post Condition**: Flashcard updated

### 2.4 Delete Flashcard (Hard delete)
- **Test Scenario**: Delete existing flashcard
- **Test Case**: TC_FC_004 - Delete OK
- **Prediction**: Removed from DB (no soft delete implemented)
- **Test Steps**: `DELETE /api/decks/flashcards/{id}/`
- **Test Data**: Flashcard id
- **Expected Result**: 204; no longer returned in listing
- **Post Condition**: Flashcard removed

### 2.5 Access Control for Flashcards
- **Test Scenario**: User B attempts to access user A's flashcard
- **Test Case**: TC_FC_005 - Ownership enforced
- **Prediction**: 404 Not Found
- **Test Steps**: Auth as user B → `GET /api/decks/flashcards/{idOfUserA}`
- **Test Data**: Flashcard id owned by user A
- **Expected Result**: 404
- **Post Condition**: None

---

## 3) Archived and Deleted Listings

### 3.1 Archived Decks Listing
- **Test Scenario**: Fetch archived decks
- **Test Case**: TC_ARCH_001 - Archived list OK
- **Prediction**: Only archived decks and not deleted
- **Test Steps**: `GET /api/decks/archived/decks/`
- **Test Data**: None
- **Expected Result**: 200 OK; each item `is_archived=true`, `is_deleted=false`
- **Post Condition**: None

### 3.2 Exclusion of Deleted from Active List
- **Test Scenario**: Soft-deleted decks excluded from active list
- **Test Case**: TC_ARCH_002 - Deleted excluded from active
- **Prediction**: Active listing hides deleted items
- **Test Steps**:
  1. Soft delete a deck
  2. `GET /api/decks/decks/`
- **Test Data**: Deleted deck id
- **Expected Result**: Deleted deck not in results
- **Post Condition**: None

---

## 4) Quiz Sessions and Progress

### 4.1 Create Quiz Session and Increment Progress
- **Test Scenario**: Posting a quiz session updates deck progress
- **Test Case**: TC_QUIZ_001 - Quiz increments progress
- **Prediction**: Deck progress increases by `int(score)//10` (or by 10 if score missing)
- **Test Steps**:
  1. Note current `progress` of deck
  2. `POST /api/decks/quizzes/sessions/` with `{ "deck": deckId, "score": 70 }`
  3. Fetch deck detail
- **Test Data**: score=70
- **Expected Result**:
  - 201 with returned `deck_progress`
  - Deck `progress` increased by 7, clamped at 100
- **Post Condition**: Deck `progress` updated

### 4.2 Quiz on Non-owned Deck
- **Test Scenario**: User attempts quiz session for someone else's deck
- **Test Case**: TC_QUIZ_002 - Ownership enforced
- **Prediction**: 404 Deck not found
- **Test Steps**: Auth as user B → `POST /api/decks/quizzes/sessions/` for user A's deck id
- **Test Data**: Foreign deck id
- **Expected Result**: 404
- **Post Condition**: None

---

## 5) Pagination

### 5.1 Deck List Pagination
- **Test Scenario**: Verify REST framework pagination on deck list
- **Test Case**: TC_PAG_001 - Deck list pagination
- **Prediction**: `results` length ≤ 10; `next/previous` present when applicable
- **Test Steps**:
  1. Create >10 decks
  2. `GET /api/decks/decks/`
- **Test Data**: N/A
- **Expected Result**: 200 with paginated structure per `PAGE_SIZE=10`
- **Post Condition**: None

### 5.2 Flashcard List Pagination
- **Test Scenario**: Verify pagination on flashcard list
- **Test Case**: TC_PAG_002 - Flashcard list pagination
- **Prediction**: `results` length ≤ 10
- **Test Steps**:
  1. Create >10 flashcards in a deck
  2. `GET /api/decks/flashcards/?deck={deckId}`
- **Test Data**: N/A
- **Expected Result**: 200 with paginated structure
- **Post Condition**: None

---

## 6) Frontend Flows (Happy Paths)

### 6.1 Create Deck via UI
- **Test Scenario**: Create deck in `Decks` page
- **Test Case**: TC_UI_Deck_001 - Create via UI
- **Prediction**: New deck visible in grid
- **Test Steps**:
  1. Login → Navigate to `/decks`
  2. Click "Add Deck" → enter title → Create
  3. Observe toast success and deck appears
- **Test Data**: Title="Physics"
- **Expected Result**: Deck visible with `0` cards
- **Post Condition**: Deck created

### 6.2 Add Flashcard via Manage Modal
- **Test Scenario**: Add card to selected deck
- **Test Case**: TC_UI_Deck_002 - Add flashcard via UI
- **Prediction**: Card appears and count increments
- **Test Steps**:
  1. Open deck menu → Manage Flashcards
  2. Add card with Q/A
  3. Save and close
- **Test Data**: Q/A sample
- **Expected Result**: Card visible; `flashcardCount +1`
- **Post Condition**: Flashcard created

### 6.3 Archive Deck via UI
- **Test Scenario**: Archive deck
- **Test Case**: TC_UI_Deck_003 - Archive via UI
- **Prediction**: Moves to Archived tab
- **Test Steps**: Use deck card action to archive; verify in Archived tab
- **Test Data**: N/A
- **Expected Result**: Deck not in active tab; present in archived
- **Post Condition**: `is_archived=true`

### 6.4 Quiz Session via UI
- **Test Scenario**: Run Quiz and update progress
- **Test Case**: TC_UI_Deck_004 - Quiz updates progress
- **Prediction**: After completion, deck progress updated
- **Test Steps**: Start Quiz → answer → complete; verify progress updated in grid
- **Test Data**: N/A
- **Expected Result**: Progress increases
- **Post Condition**: Progress persisted

---

## 7) Negative and Edge Cases

### 7.1 Create Deck Without Title
- **Test Scenario**: Missing required field
- **Test Case**: TC_NEG_001 - Title required
- **Prediction**: 400 with validation error
- **Test Steps**: `POST /api/decks/decks/` `{}`
- **Test Data**: Empty body
- **Expected Result**: 400 Bad Request
- **Post Condition**: None

### 7.2 Create Flashcard Without Front/Back
- **Test Scenario**: Missing fields on flashcard
- **Test Case**: TC_NEG_002 - Front/back required
- **Prediction**: 400 Bad Request
- **Test Steps**: `POST /api/decks/flashcards/` with missing field(s)
- **Test Data**: Incomplete body
- **Expected Result**: 400
- **Post Condition**: None

### 7.3 Get Soft-deleted Deck Detail
- **Test Scenario**: Retrieve a soft-deleted deck directly by id
- **Test Case**: TC_NEG_003 - Soft-deleted retrievable
- **Prediction**: 200 OK (current viewset does not filter by `is_deleted` on detail)
- **Test Steps**:
  1. Soft delete a deck
  2. `GET /api/decks/decks/{id}/`
- **Test Data**: Deleted deck id
- **Expected Result**: 200 OK with `is_deleted=true`
- **Post Condition**: None

### 7.4 Create Subdeck Under Non-owned Parent
- **Test Scenario**: Create child under someone else's parent
- **Test Case**: TC_NEG_004 - Ownership enforced on parent
- **Prediction**: 400 or 404 (parent not found for user)
- **Test Steps**: POST with `parent` not owned
- **Test Data**: Foreign parent id
- **Expected Result**: 404
- **Post Condition**: None

---

## 8) Notes → Flashcards Conversion (Frontend-assisted)

### 8.1 Convert Multiple Notes to Single Deck
- **Test Scenario**: Create one deck and multiple flashcards from selected notes
- **Test Case**: TC_CONV_001 - Single deck conversion
- **Prediction**: Deck created; flashcards created for each parsed Q/A
- **Test Steps**:
  1. In `/decks`, open "Convert Notes"
  2. Select notebook and notes; choose "single deck"
  3. Click Convert
- **Test Data**: Notes with Q:/A: lines
- **Expected Result**: New deck with flashcards; success toast
- **Post Condition**: Deck + cards created via `/decks/` and `/flashcards/`

### 8.2 Convert Each Note to Separate Deck
- **Test Scenario**: One deck per note
- **Test Case**: TC_CONV_002 - Per-note conversion
- **Prediction**: N decks created; cards created under each
- **Test Steps**: Choose "deck per note" strategy and convert
- **Test Data**: Multiple notes
- **Expected Result**: N new decks each with cards
- **Post Condition**: Multiple decks and cards created

---

## Prerequisites and Environment
- Backend running at `http://localhost:8000`, JWT auth enabled
- Frontend at `http://localhost:3000`
- REST_FRAMEWORK pagination: `PAGE_SIZE=10`
- Endpoints:
  - Decks: `GET/POST /api/decks/decks/`, `GET/PATCH/DELETE /api/decks/decks/{id}/`, `GET /api/decks/archived/decks/`
  - Flashcards: `GET/POST /api/decks/flashcards/`, `GET/PATCH/DELETE /api/decks/flashcards/{id}/`
  - Quiz sessions: `POST /api/decks/quizzes/sessions/`

## Reporting
- Record Actual Result, attach logs/responses
- Capture IDs created for cleanup
- Note deviations (e.g., soft-deleted decks still retrievable by id)
