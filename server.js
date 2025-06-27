require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON
app.use(express.json());

// CORS 설정 - 프로덕션과 개발 환경 모두 허용
const allowedOrigins = [
  'https://digitalcanvas-git-main-digitalcanvas-projects.vercel.app',
  'https://digitalcanvas.vercel.app',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Successfully connected to MongoDB');
  createInitialSpaces();
})
.catch(err => console.error('Could not connect to MongoDB', err));

// Schemas and Models
// About Schema
const aboutSchema = new mongoose.Schema({
  content: String,
  mainText: String,
  subText: String,
  btn1: String,
  btn2: String,
}, { timestamps: true });
const About = mongoose.model('About', aboutSchema);

// Space Schema
const spaceSchema = new mongoose.Schema({
  title: String,
  content: String,
  thumbnailUrl: String,
});
const Space = mongoose.model('Space', spaceSchema);

// Notice Schema
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });
const Notice = mongoose.model('Notice', noticeSchema);

// Program Schema
const programSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
}, { timestamps: true });
const Program = mongoose.model('Program', programSchema, 'program');

// Schedule Schema (for reservations)
const scheduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  type: { type: String, enum: ['space', 'equipment'], required: true },
}, { timestamps: true });
const Schedule = mongoose.model('Schedule', scheduleSchema, 'schedules');

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(403).send('A token is required for authentication');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }
  return next();
};

// Initial Data Functions
async function createInitialSpaces() {
  try {
    const count = await Space.countDocuments();
    if (count === 0) {
      const initialSpaces = [
        { title: '공간 1', content: '공간 1의 상세 내용입니다.', thumbnailUrl: 'https://via.placeholder.com/300' },
        { title: '공간 2', content: '공간 2의 상세 내용입니다.', thumbnailUrl: 'https://via.placeholder.com/300' },
        { title: '공간 3', content: '공간 3의 상세 내용입니다.', thumbnailUrl: 'https://via.placeholder.com/300' },
        { title: '공간 4', content: '공간 4의 상세 내용입니다.', thumbnailUrl: 'https://via.placeholder.com/300' },
        { title: '공간 5', content: '공간 5의 상세 내용입니다.', thumbnailUrl: 'https://via.placeholder.com/300' },
      ];
      await Space.insertMany(initialSpaces);
      console.log('Initial space data created.');
    }
  } catch (error) {
    console.error('Error creating initial space data:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Endpoints

// About
app.get('/api/about', async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) {
      about = new About({
        content: '내용을 입력해주세요.',
        mainText: 'DIGITAL CANVAS',
        subText: '모든 디지털 창작, 한 곳에서.',
        btn1: '공간 둘러보기',
        btn2: '프로그램 보기',
      });
      await about.save();
    }
    res.json(about);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put('/api/about', async (req, res) => {
  try {
    const { content, mainText, subText, btn1, btn2 } = req.body;
    let about = await About.findOne();
    if (about) {
      about.content = content;
      about.mainText = mainText;
      about.subText = subText;
      about.btn1 = btn1;
      about.btn2 = btn2;
    } else {
      about = new About({ content, mainText, subText, btn1, btn2 });
    }
    await about.save();
    res.status(200).send(about);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.delete('/api/about', async (req, res) => {
  try {
    let about = await About.findOne();
    if (about) {
      about.content = '<p>내용을 입력하세요.</p>';
      await about.save();
    } else {
      about = new About({ 
        content: '<p>내용을 입력하세요.</p>' 
      });
      await about.save();
    }
    res.status(200).send(about);
  } catch (error) {
    res.status(500).send({ message: 'Failed to delete about content', error });
  }
});

// Spaces
app.get('/api/spaces', async (req, res) => {
  try {
    const spaces = await Space.find();
    res.json(spaces);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/api/spaces/:id', async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) return res.status(404).send('Space not found.');
    res.json(space);
  } catch (error) {
    res.status(500).send('Error fetching space');
  }
});

app.put('/api/spaces/:id', async (req, res) => {
  try {
    const { title, content, thumbnailUrl } = req.body;
    const space = await Space.findByIdAndUpdate(req.params.id, { title, content, thumbnailUrl }, { new: true });
    if (!space) return res.status(404).send('Space not found.');
    res.json(space);
  } catch (error) {
    res.status(500).send('Error updating space');
  }
});

// Notices
app.get('/api/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/api/notices/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).send('Notice not found');
    res.json(notice);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/notices', async (req, res) => {
  try {
    const { title, content } = req.body;
    const notice = new Notice({ title, content });
    await notice.save();
    res.status(201).json(notice);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.put('/api/notices/:id', async (req, res) => {
  try {
    const { title, content } = req.body;
    const notice = await Notice.findByIdAndUpdate(req.params.id, { title, content }, { new: true, runValidators: true });
    if (!notice) return res.status(404).send('Notice not found');
    res.json(notice);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.delete('/api/notices/:id', async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).send('Notice not found');
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
});

// Programs
app.get('/api/programs', async (req, res) => {
  try {
    const programs = await Program.find().sort({ createdAt: -1 });
    res.json(programs);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/api/programs/:id', async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) return res.status(404).send('Program not found');
    res.json(program);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/programs', verifyToken, async (req, res) => {
  try {
    const { title, content, thumbnailUrl } = req.body;
    const program = new Program({ title, content, thumbnailUrl });
    await program.save();
    res.status(201).json(program);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.put('/api/programs/:id', async (req, res) => {
  try {
    const { title, content, thumbnailUrl } = req.body;
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      { title, content, thumbnailUrl },
      { new: true, runValidators: true }
    );
    if (!program) return res.status(404).send('Program not found');
    res.json(program);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.delete('/api/programs/:id', async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);
    if (!program) return res.status(404).send('Program not found');
    res.status(204).send();
  } catch (error) {
    res.status(500).send(error);
  }
});

// Schedules (Reservations)
app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.json(schedules);
  } catch (error) {
    res.status(500).send('Error fetching schedules');
  }
});

app.post('/api/schedules', verifyToken, async (req, res) => {
  try {
    const { title, start, end, type } = req.body;
    const newSchedule = new Schedule({ title, start, end, type });
    await newSchedule.save();
    res.status(201).json(newSchedule);
  } catch (error) {
    res.status(400).send('Error creating schedule');
  }
});

app.delete('/api/schedules/:id', verifyToken, async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) return res.status(404).send('Schedule not found');
    res.status(204).send();
  } catch (error) {
    res.status(500).send('Error deleting schedule');
  }
});

// Authentication
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send({ message: "Username and password are required." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({ message: 'Username already exists' });
    }
    res.status(500).send({ message: 'Error creating user', error });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send({ message: 'Invalid credentials' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).send({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Server error');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 