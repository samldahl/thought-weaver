import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './config/env';
import { connectDB } from './config/database';
import documentRoutes from './routes/documents';
import authRoutes from './routes/auth';

const app: Application = express();
const PORT = env.PORT;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:8080', 
    'http://localhost:8081',
    'https://www.thoughtweaver.xyz',
    'https://thoughtweaver.xyz',
    /\.vercel\.app$/, // Allow all Vercel preview/production URLs
    /\.ngrok-free\.dev$/, // Allow ngrok URLs
  ],
  credentials: true,
}));
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      touchAfter: 24 * 3600, // lazy session update
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
    },
  })
);

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
