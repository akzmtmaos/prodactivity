// frontend/src/types/archive.ts
import type { Notebook as ActiveNotebook, Note as ActiveNote } from './notes';

/**
 * Archived notebook row shape. Uses the same shape as an active notebook, with
 * additional archived_at tracking.
 */
export type ArchiveNotebook = ActiveNotebook;

/**
 * Archived note row shape. Uses the same shape as an active note, with
 * additional archived_at tracking.
 */
export type ArchiveNote = ActiveNote;
