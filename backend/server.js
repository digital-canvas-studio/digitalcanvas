const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Successfully connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    message: 'Digital Canvas Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      about: '/api/about',
      spaces: '/api/spaces',
      notices: '/api/notices',
      programs: '/api/programs',
      schedules: '/api/schedules',
      auth: '/api/login, /api/register'
    }
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Digital Canvas Backend API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      programs: '/api/programs',
      spaces: '/api/spaces',
      notices: '/api/notices'
    }
  });
});

// MongoDB Schemas
const programSchema = new mongoose.Schema({
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  instructor: String,
  maxParticipants: Number,
  currentParticipants: Number,
  category: String,
  status: String
});

const spaceSchema = new mongoose.Schema({
  name: String,
  capacity: Number,
  equipment: [String],
  status: String
});

const noticeSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  createdAt: Date,
  category: String,
  status: String
});

// MongoDB Models
const Program = mongoose.model('Program', programSchema);
const Space = mongoose.model('Space', spaceSchema);
const Notice = mongoose.model('Notice', noticeSchema);

// API routes
app.get('/api/programs', async (req, res) => {
  try {
    const programs = await Program.find();
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/spaces', async (req, res) => {
  try {
    const spaces = await Space.find();
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notices', async (req, res) => {
  try {
    const notices = await Notice.find();
    res.json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
