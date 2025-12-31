import { DocumentModel } from '../models/Document';
import mongoose from 'mongoose';

export async function ensureTodayDocument(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayTitle = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Check if today's document already exists
  let document = await DocumentModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    createdAt: {
      $gte: today,
      $lt: tomorrow
    }
  });

  // If not, create it
  if (!document) {
    document = await DocumentModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: todayTitle,
      thoughts: [],
      zoom: 0.5,
      pan: { x: 0, y: 0 },
      usedColors: []
    });
  }

  return document;
}
