import express, { Request, Response } from 'express';
import { DocumentModel } from '../models/Document';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { ensureTodayDocument } from '../utils/dailyDocument';
import { organizeThoughtsWithAI } from '../utils/aiOrganizer';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all documents for the authenticated user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    // Ensure today's document exists
    await ensureTodayDocument(req.userId!);
    
    const documents = await DocumentModel.find({ userId: req.userId }).sort({ updatedAt: -1 });
    
    // Separate documents with and without thoughts
    const withThoughts = documents.filter(doc => doc.thoughts && doc.thoughts.length > 0);
    const withoutThoughts = documents.filter(doc => !doc.thoughts || doc.thoughts.length === 0);
    
    res.json({
      withThoughts,
      withoutThoughts,
      all: documents
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a single document by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const document = await DocumentModel.findOne({ _id: req.params.id, userId: req.userId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create a new document
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const document = new DocumentModel({
      ...req.body,
      userId: req.userId,
    });
    await document.save();
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update a document
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const document = await DocumentModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete a document
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const document = await DocumentModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get all thoughts across all documents for constellation view
router.get('/thoughts/all', async (req: AuthRequest, res: Response) => {
  try {
    const documents = await DocumentModel.find({ userId: req.userId }).sort({ createdAt: -1 });
    const allThoughts = documents.flatMap(doc => 
      doc.thoughts.map(thought => ({
        id: thought.id,
        text: thought.text,
        color: thought.color,
        documentName: doc.name,
        documentId: doc._id,
        documentDate: doc.createdAt,
        x: thought.x,
        y: thought.y,
        size: thought.size
      }))
    );
    
    res.json(allThoughts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch thoughts' });
  }
});

// AI-organize thoughts endpoint
router.post('/thoughts/organize', async (req: AuthRequest, res: Response) => {
  try {
    const { thoughts } = req.body;
    
    if (!thoughts || !Array.isArray(thoughts)) {
      return res.status(400).json({ error: 'Invalid thoughts data' });
    }
    
    const organized = await organizeThoughtsWithAI(thoughts);
    res.json(organized);
  } catch (error) {
    console.error('Failed to organize thoughts:', error);
    res.status(500).json({ error: 'Failed to organize thoughts' });
  }
});

export default router;
