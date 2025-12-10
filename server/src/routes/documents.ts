import express, { Request, Response } from 'express';
import { DocumentModel } from '../models/Document';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all documents for the authenticated user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const documents = await DocumentModel.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(documents);
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

export default router;
