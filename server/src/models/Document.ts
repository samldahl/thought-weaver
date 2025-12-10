import mongoose, { Schema, Document as MongoDocument } from 'mongoose';

export interface IThought {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: string;
  parentId?: string;
  notes?: string;
}

export interface IDocument extends MongoDocument {
  userId: mongoose.Types.ObjectId;
  name: string;
  thoughts: IThought[];
  zoom: number;
  pan: {
    x: number;
    y: number;
  };
  usedColors: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ThoughtSchema = new Schema<IThought>({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  size: { type: Number, required: true },
  text: { type: String, default: '' },
  color: { type: String, required: true },
  parentId: { type: String },
  notes: { type: String }
});

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, default: 'Untitled' },
    thoughts: { type: [ThoughtSchema], default: [] },
    zoom: { type: Number, default: 0.5 },
    pan: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    usedColors: { type: [String], default: [] }
  },
  {
    timestamps: true
  }
);

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
