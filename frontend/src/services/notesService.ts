import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';

// Type definitions
type Notebook = Database['public']['Tables']['notebooks']['Row'];
type NotebookInsert = Database['public']['Tables']['notebooks']['Insert'];
type NotebookUpdate = Database['public']['Tables']['notebooks']['Update'];

type Note = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

// Extended types for UI compatibility
export interface NotebookWithCount extends Notebook {
  notes_count: number;
  color?: string;
}

export interface NoteWithNotebook extends Note {
  notebook_name?: string;
  notebook_color?: string;
}

// Get current user ID
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
};

// =============================================
// NOTEBOOKS SERVICE
// =============================================

export const notebooksService = {
  // Fetch all notebooks for the current user
  async fetchNotebooks(): Promise<NotebookWithCount[]> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notebooks')
      .select(`
        *,
        notes:notes(count)
      `)
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching notebooks:', error);
      throw new Error('Failed to fetch notebooks');
    }

    // Transform the data to include notes_count
    return data.map(notebook => ({
      ...notebook,
      notes_count: notebook.notes?.[0]?.count || 0
    }));
  },

  // Fetch archived notebooks
  async fetchArchivedNotebooks(): Promise<NotebookWithCount[]> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notebooks')
      .select(`
        *,
        notes:notes(count)
      `)
      .eq('user_id', userId)
      .eq('is_archived', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching archived notebooks:', error);
      throw new Error('Failed to fetch archived notebooks');
    }

    return data.map(notebook => ({
      ...notebook,
      notes_count: notebook.notes?.[0]?.count || 0
    }));
  },

  // Create a new notebook
  async createNotebook(notebookData: Omit<NotebookInsert, 'user_id'>): Promise<Notebook> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notebooks')
      .insert({
        ...notebookData,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notebook:', error);
      throw new Error('Failed to create notebook');
    }

    return data;
  },

  // Update a notebook
  async updateNotebook(id: number, updates: NotebookUpdate): Promise<Notebook> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notebooks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notebook:', error);
      throw new Error('Failed to update notebook');
    }

    return data;
  },

  // Archive a notebook
  async archiveNotebook(id: number): Promise<void> {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('notebooks')
      .update({ 
        is_archived: true, 
        archived_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error archiving notebook:', error);
      throw new Error('Failed to archive notebook');
    }
  },

  // Unarchive a notebook
  async unarchiveNotebook(id: number): Promise<void> {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('notebooks')
      .update({ 
        is_archived: false, 
        archived_at: null 
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unarchiving notebook:', error);
      throw new Error('Failed to unarchive notebook');
    }
  },

  // Delete a notebook (soft delete by archiving)
  async deleteNotebook(id: number): Promise<void> {
    await this.archiveNotebook(id);
  }
};

// =============================================
// NOTES SERVICE
// =============================================

export const notesService = {
  // Fetch notes for a specific notebook
  async fetchNotes(notebookId: number): Promise<NoteWithNotebook[]> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        notebook:notebooks(name)
      `)
      .eq('notebook_id', notebookId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      throw new Error('Failed to fetch notes');
    }

    return data.map(note => ({
      ...note,
      notebook_name: note.notebook?.name
    }));
  },

  // Fetch all notes for the current user (for global search)
  async fetchAllNotes(): Promise<NoteWithNotebook[]> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        notebook:notebooks(name)
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all notes:', error);
      throw new Error('Failed to fetch all notes');
    }

    return data.map(note => ({
      ...note,
      notebook_name: note.notebook?.name
    }));
  },

  // Fetch archived notes
  async fetchArchivedNotes(): Promise<NoteWithNotebook[]> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        notebook:notebooks(name)
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching archived notes:', error);
      throw new Error('Failed to fetch archived notes');
    }

    return data.map(note => ({
      ...note,
      notebook_name: note.notebook?.name
    }));
  },

  // Create a new note
  async createNote(noteData: Omit<NoteInsert, 'user_id'>): Promise<Note> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notes')
      .insert({
        ...noteData,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      throw new Error('Failed to create note');
    }

    return data;
  },

  // Update a note
  async updateNote(id: number, updates: NoteUpdate): Promise<Note> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      throw new Error('Failed to update note');
    }

    return data;
  },

  // Update last visited timestamp
  async updateLastVisited(id: number): Promise<void> {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('notes')
      .update({ last_visited: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating last visited:', error);
      // Don't throw error for this as it's not critical
    }
  },

  // Archive a note
  async archiveNote(id: number): Promise<void> {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('notes')
      .update({ 
        is_archived: true, 
        archived_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error archiving note:', error);
      throw new Error('Failed to archive note');
    }
  },

  // Unarchive a note
  async unarchiveNote(id: number): Promise<void> {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('notes')
      .update({ 
        is_archived: false, 
        archived_at: null 
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unarchiving note:', error);
      throw new Error('Failed to unarchive note');
    }
  },

  // Delete a note (soft delete)
  async deleteNote(id: number): Promise<void> {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('notes')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete note');
    }
  },

  // Search notes
  async searchNotes(query: string, notebookId?: number): Promise<NoteWithNotebook[]> {
    const userId = await getCurrentUserId();
    
    let queryBuilder = supabase
      .from('notes')
      .select(`
        *,
        notebook:notebooks(name)
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('is_archived', false);

    if (notebookId) {
      queryBuilder = queryBuilder.eq('notebook_id', notebookId);
    }

    // Search in title and content
    const { data, error } = await queryBuilder
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.ilike.%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error searching notes:', error);
      throw new Error('Failed to search notes');
    }

    return data.map(note => ({
      ...note,
      notebook_name: note.notebook?.name
    }));
  }
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

// Generate a color for a notebook based on its ID
export const generateNotebookColor = (notebookId: number): string => {
  const colors = [
    'hsl(0, 70%, 85%)',    // Red
    'hsl(30, 70%, 85%)',   // Orange
    'hsl(60, 70%, 85%)',   // Yellow
    'hsl(120, 70%, 85%)',  // Green
    'hsl(180, 70%, 85%)',  // Cyan
    'hsl(240, 70%, 85%)',  // Blue
    'hsl(270, 70%, 85%)',  // Purple
    'hsl(300, 70%, 85%)',  // Magenta
  ];
  return colors[notebookId % colors.length];
};

// Save notebook colors to localStorage
export const saveNotebookColor = (notebookId: number, color: string): void => {
  const colors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
  colors[notebookId] = color;
  localStorage.setItem('notebookColors', JSON.stringify(colors));
};

// Get notebook color from localStorage
export const getNotebookColor = (notebookId: number): string => {
  const colors = JSON.parse(localStorage.getItem('notebookColors') || '{}');
  return colors[notebookId] || generateNotebookColor(notebookId);
};
