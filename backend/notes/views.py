# notes/views.py
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Notebook, Note
from .serializers import NotebookSerializer, NoteSerializer
import os
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import docx
import tempfile
from django.utils import timezone

class NotebookListCreateView(generics.ListCreateAPIView):
    serializer_class = NotebookSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter by archive status
        is_archived = self.request.query_params.get('archived', 'false').lower() == 'true'
        return Notebook.objects.filter(user=self.request.user, is_archived=is_archived)

class NotebookRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NotebookSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notebook.objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        notebook = self.get_object()
        # Soft delete all notes in this notebook
        notebook.notes.update(is_deleted=True, deleted_at=timezone.now())
        notebook.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, *args, **kwargs):
        notebook = self.get_object()
        is_archived = request.data.get('is_archived', None)
        if is_archived is not None:
            notebook.is_archived = is_archived
            notebook.archived_at = timezone.now() if is_archived else None
            notebook.save()
        serializer = self.get_serializer(notebook)
        return Response(serializer.data)

class NoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter by archive status
        is_archived = self.request.query_params.get('archived', 'false').lower() == 'true'
        queryset = Note.objects.filter(user=self.request.user, is_deleted=False, is_archived=is_archived)
        
        # Filter by notebook if provided (unless global search is requested)
        notebook_id = self.request.query_params.get('notebook', None)
        global_search = self.request.query_params.get('global_search', 'false').lower() == 'true'
        
        if notebook_id is not None and not global_search:
            queryset = queryset.filter(notebook_id=notebook_id)
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search is not None:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
        
        return queryset

class NoteRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        note = self.get_object()
        if note.is_deleted:
            note.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        note.is_deleted = True
        note.deleted_at = timezone.now()
        note.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def update(self, request, *args, **kwargs):
        note = self.get_object()
        print(f"[DEBUG] PUT /api/notes/{note.id}/ - data: {request.data}")
        
        # Update the note with the provided data
        serializer = self.get_serializer(note, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            print(f"[DEBUG] Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        note = self.get_object()
        print(f"[DEBUG] PATCH /api/notes/{note.id}/ - data: {request.data}")
        
        # Handle archive status
        is_archived = request.data.get('is_archived', None)
        if is_archived is not None:
            note.is_archived = is_archived
            note.archived_at = timezone.now() if is_archived else None
            note.save()
            print(f"[DEBUG] Note {note.id} updated: is_archived={note.is_archived}, archived_at={note.archived_at}")
        
        # Handle delete status
        is_deleted = request.data.get('is_deleted', None)
        if is_deleted is not None:
            note.is_deleted = is_deleted
            note.deleted_at = None if not is_deleted else timezone.now()
            note.save()
            print(f"[DEBUG] Note {note.id} updated: is_deleted={note.is_deleted}, deleted_at={note.deleted_at}")
        
        serializer = self.get_serializer(note)
        return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def convert_doc(request):
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    file = request.FILES['file']
    if not file.name.endswith(('.doc', '.docx')):
        return Response({'error': 'Invalid file type. Please upload a DOC or DOCX file.'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Save the uploaded file temporarily
        temp_path = default_storage.save(f'temp/{file.name}', ContentFile(file.read()))
        temp_file_path = os.path.join(settings.MEDIA_ROOT, temp_path)
        
        # Open and read the document
        doc = docx.Document(temp_file_path)
        
        # Extract text from paragraphs
        text = '\n\n'.join([paragraph.text for paragraph in doc.paragraphs])
        
        # Clean up the temporary file
        default_storage.delete(temp_path)
        
        return Response({'text': text})
    except Exception as e:
        # Clean up in case of error
        if 'temp_path' in locals():
            default_storage.delete(temp_path)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def deleted_notes(request):
    notes = Note.objects.filter(user=request.user, is_deleted=True)
    print(f"[DEBUG] Trash API - User: {request.user}, Deleted Notes: {list(notes.values('id', 'title', 'is_deleted', 'deleted_at'))}")
    serializer = NoteSerializer(notes, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def archived_notes(request):
    notes = Note.objects.filter(user=request.user, is_archived=True, is_deleted=False)
    serializer = NoteSerializer(notes, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def archived_notebooks(request):
    notebooks = Notebook.objects.filter(user=request.user, is_archived=True)
    serializer = NotebookSerializer(notebooks, many=True)
    return Response(serializer.data) 

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search_notes(request):
    """
    Global search endpoint to search across all notes and notebooks
    """
    search_query = request.query_params.get('q', '')
    if not search_query.strip():
        return Response({'results': []})
    
    results = []
    
    # Search across all notes (not deleted, not archived)
    notes = Note.objects.filter(
        user=request.user,
        is_deleted=False,
        is_archived=False
    ).filter(
        Q(title__icontains=search_query) | 
        Q(content__icontains=search_query)
    ).select_related('notebook').order_by('-updated_at')
    
    # Add notes to results
    for note in notes:
        results.append({
            'id': note.id,
            'type': 'note',
            'title': note.title,
            'content': note.content[:200] + '...' if len(note.content) > 200 else note.content,
            'notebook_id': note.notebook.id,
            'notebook_name': note.notebook.name,
            'created_at': note.created_at,
            'updated_at': note.updated_at,
            'url': f'/notes/{note.id}'
        })
    
    # Search across all notebooks (not archived)
    notebooks = Notebook.objects.filter(
        user=request.user,
        is_archived=False
    ).filter(
        Q(name__icontains=search_query)
    ).order_by('-updated_at')
    
    # Add notebooks to results
    for notebook in notebooks:
        results.append({
            'id': notebook.id,
            'type': 'notebook',
            'title': notebook.name,
            'content': f'Notebook with {notebook.notes_count} notes',
            'notebook_id': notebook.id,
            'notebook_name': notebook.name,
            'created_at': notebook.created_at,
            'updated_at': notebook.updated_at,
            'url': f'/notes?notebook={notebook.id}'
        })
    
    # Sort all results by updated_at (most recent first)
    results.sort(key=lambda x: x['updated_at'], reverse=True)
    
    return Response({'results': results}) 