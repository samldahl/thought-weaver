# Thought Weaver Backend

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB installed locally OR MongoDB Atlas account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` and configure your MongoDB connection:
   - For local MongoDB: `MONGODB_URI=mongodb://localhost:27017/thought-weaver`
   - For MongoDB Atlas: Use your connection string

### Running the Backend

#### Option 1: Run backend only
```bash
npm run server
```

#### Option 2: Run both frontend and backend
```bash
npm run dev:all
```

The server will run on `http://localhost:5000` by default.

### API Endpoints

#### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get a specific document
- `POST /api/documents` - Create a new document
- `PUT /api/documents/:id` - Update a document
- `DELETE /api/documents/:id` - Delete a document

#### Health Check
- `GET /api/health` - Server health status

### MongoDB Setup

#### Local MongoDB
1. Install MongoDB: https://www.mongodb.com/docs/manual/installation/
2. Start MongoDB service:
   - macOS: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`
   - Windows: MongoDB runs as a service

#### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get your connection string
4. Update `.env` with your Atlas connection string

### Building for Production
```bash
npm run server:build
```

The compiled JavaScript will be in `server/dist/`.
