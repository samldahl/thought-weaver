import { useState, useEffect, useCallback } from 'react';
import { apiService, Document as ApiDocument } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Thought {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: string;
  parentId?: string;
  notes?: string;
}

interface DocumentData {
  _id?: string;
  id: string;
  name: string;
  thoughts: Thought[];
  zoom: number;
  pan: { x: number; y: number };
  usedColors: string[];
  createdAt: number;
}

export function useDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string>("");
  const [currentDocument, setCurrentDocument] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load all documents on mount - only when authenticated
  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Load current document when currentDocId changes
  useEffect(() => {
    if (currentDocId && documents.length > 0) {
      const doc = documents.find(d => (d._id || d.id) === currentDocId);
      if (doc) {
        setCurrentDocument(doc);
      }
    }
  }, [currentDocId, documents]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const docs = await apiService.getAllDocuments();
      
      // Convert MongoDB documents to our format
      const formattedDocs: DocumentData[] = docs.map(doc => ({
        _id: doc._id,
        id: doc._id || doc.id || '',
        name: doc.name,
        thoughts: doc.thoughts || [],
        zoom: doc.zoom || 0.5,
        pan: doc.pan || { x: 0, y: 0 },
        usedColors: doc.usedColors || [],
        createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
      }));

      if (formattedDocs.length === 0) {
        // Create first document if none exist
        await createDocument();
      } else {
        setDocuments(formattedDocs);
        setCurrentDocId(formattedDocs[0]._id || formattedDocs[0].id);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const createDocument = async (name?: string) => {
    try {
      const newDoc = await apiService.createDocument({
        name: name || `Document ${documents.length + 1}`,
        thoughts: [],
        zoom: 0.5,
        pan: { x: 0, y: 0 },
        usedColors: [],
      });

      const formattedDoc: DocumentData = {
        _id: newDoc._id,
        id: newDoc._id || '',
        name: newDoc.name,
        thoughts: newDoc.thoughts || [],
        zoom: newDoc.zoom || 0.5,
        pan: newDoc.pan || { x: 0, y: 0 },
        usedColors: newDoc.usedColors || [],
        createdAt: newDoc.createdAt ? new Date(newDoc.createdAt).getTime() : Date.now(),
      };

      setDocuments(prev => [...prev, formattedDoc]);
      setCurrentDocId(formattedDoc._id || formattedDoc.id);
      toast.success('Document created');
      
      return formattedDoc;
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error('Failed to create document');
      throw error;
    }
  };

  const updateDocument = async (
    docId: string,
    updates: Partial<Omit<DocumentData, '_id' | 'id' | 'createdAt'>>
  ) => {
    try {
      setIsSaving(true);
      await apiService.updateDocument(docId, updates);
      
      setDocuments(prev =>
        prev.map(doc =>
          (doc._id || doc.id) === docId ? { ...doc, ...updates } : doc
        )
      );
    } catch (error) {
      console.error('Failed to update document:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await apiService.deleteDocument(docId);
      
      const newDocs = documents.filter(d => (d._id || d.id) !== docId);
      setDocuments(newDocs);
      
      // If deleting current document, switch to another
      if (docId === currentDocId && newDocs.length > 0) {
        setCurrentDocId(newDocs[0]._id || newDocs[0].id);
      }
      
      toast.success('Document deleted');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const renameDocument = async (docId: string, newName: string) => {
    try {
      await apiService.updateDocument(docId, { name: newName });
      setDocuments(prev =>
        prev.map(doc =>
          (doc._id || doc.id) === docId ? { ...doc, name: newName } : doc
        )
      );
    } catch (error) {
      console.error('Failed to rename document:', error);
      toast.error('Failed to rename document');
    }
  };

  const selectDocument = (docId: string) => {
    setCurrentDocId(docId);
  };

  return {
    documents,
    currentDocument,
    currentDocId,
    isLoading,
    isSaving,
    createDocument,
    updateDocument,
    deleteDocument,
    renameDocument,
    selectDocument,
  };
}
