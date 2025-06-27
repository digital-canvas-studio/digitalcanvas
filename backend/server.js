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

// Placeholder API routes
app.get('/api/programs', (req, res) => {
  res.json([]);
});

app.get('/api/spaces', (req, res) => {
  res.json([]);
});

app.get('/api/notices', (req, res) => {
  res.json([]);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
