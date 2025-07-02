const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Redirect www to naked domain
app.use((req, res, next) => {
  if (req.headers.host === 'knuh-ditdo.kr') {
    return res.redirect(301, 'https://www.knuh-ditdo.kr' + req.originalUrl);
  }
  next();
});

// JWT Secret (환경변수에서 가져오거나 기본값 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://www.knuh-ditdo.kr'
];

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// MongoDB Connection (with connection pool)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // 동시에 최대 10개 커넥션 유지
})
.then(() => console.log('Successfully connected to MongoDB (with connection pool)'))
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
      programs: '/api/program',
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
      notices: '/api/notices',
      auth: '/api/login, /api/register'
    }
  });
});

// MongoDB Schemas
const programSchema = new mongoose.Schema({
  title: String,
  content: String,
  thumbnailUrl: String,
  description: String,
  startDate: Date,
  endDate: Date,
  instructor: String,
  maxParticipants: Number,
  currentParticipants: Number,
  category: String,
  status: String
}, { collection: 'program' }); // program 콜렉션 사용

const spaceSchema = new mongoose.Schema({
  title: String,
  content: String,
  thumbnailUrl: String,
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

const aboutSchema = new mongoose.Schema({
  title: String,
  description: String,
  mission: String,
  vision: String,
  contact: mongoose.Schema.Types.Mixed,
  established: String,
  facilities: [String],
  // 메인페이지용 필드들 추가
  mainText: String,
  subText: String,
  btn1: String,
  btn2: String,
  btn1Link: String,
  btn2Link: String,
  mainImage: String,
  content: String
}, { collection: 'abouts' }); // 기존 abouts 콜렉션 사용

// User Schema for authentication
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, default: 'user' }, // user, admin
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { collection: 'users' }); // 기존 users 콜렉션 사용

// Schedule/Reservation Schema
const scheduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  type: { type: String, enum: ['space', 'equipment'], default: 'space' },
  spaces: [String],
  equipment: [String],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
  notes: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'schedules' });

// MongoDB Models
const Program = mongoose.model('Program', programSchema, 'program');
const Space = mongoose.model('Space', spaceSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const About = mongoose.model('About', aboutSchema, 'abouts');
const User = mongoose.model('User', userSchema, 'users');
const Schedule = mongoose.model('Schedule', scheduleSchema, 'schedules');

// API for About section (Main page content)
app.get('/api/abouts', async (req, res) => {
  try {
    // abouts 컬렉션은 문서가 하나만 있을 것으로 가정
    const aboutData = await About.findOne();
    if (!aboutData) {
      return res.status(404).json({ message: 'About data not found.' });
    }
    res.json(aboutData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/abouts', async (req, res) => {
  try {
    // findOneAndUpdate를 사용하여 첫 번째 문서를 찾아 업데이트하거나, 문서가 없으면 생성(upsert: true)
    const updatedAbout = await About.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(updatedAbout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth API routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 사용자 찾기 (username 또는 email로 로그인 가능)
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: username }
      ],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 프로필 정보 가져오기
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    // authenticateToken 미들웨어에서 req.user에 저장된 사용자 ID를 사용
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회원가입 API
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // 기존 사용자 확인
    const existingUser = await User.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 사용자입니다.' });
    }

    // 비밀번호 해시화
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 새 사용자 생성
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      name: name || username
    });

    await newUser.save();

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// API routes
app.get('/api/programs', async (req, res) => {
  try {
    const programs = await Program.find();
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new program
app.post('/api/programs', async (req, res) => {
  try {
    const { title, content, thumbnailUrl, description, startDate, endDate, instructor, maxParticipants, category, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newProgram = new Program({
      title,
      content,
      thumbnailUrl: thumbnailUrl || '',
      description: description || '',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      instructor: instructor || '',
      maxParticipants: maxParticipants || 0,
      currentParticipants: 0,
      category: category || '',
      status: status || 'active'
    });

    const savedProgram = await newProgram.save();
    res.status(201).json(savedProgram);
  } catch (error) {
    console.error('Program creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update program by ID
app.put('/api/programs/:id', async (req, res) => {
  try {
    const { title, content, thumbnailUrl, description, startDate, endDate, instructor, maxParticipants, category, status } = req.body;

    const updateData = {
      title,
      content,
      thumbnailUrl,
      description,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      instructor,
      maxParticipants,
      category,
      status
    };

    // undefined 값들을 제거
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const program = await Program.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Program update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single program by ID
app.get('/api/programs/:id', async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete program by ID
app.delete('/api/programs/:id', async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Program delete error:', error);
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

// Create new space
app.post('/api/spaces', async (req, res) => {
  try {
    const { title, content, thumbnailUrl, capacity, equipment, status } = req.body;
    const newSpace = new Space({ 
      name: title, // name을 title과 동일하게 설정
      title, 
      content, 
      thumbnailUrl, 
      capacity, 
      equipment, 
      status 
    });
    const savedSpace = await newSpace.save();
    res.status(201).json(savedSpace);
  } catch (error) {
    console.error('Space creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update space by ID
app.put('/api/spaces/:id', async (req, res) => {
  try {
    const { title, content, thumbnailUrl, capacity, equipment, status } = req.body;
    const updatedSpace = await Space.findByIdAndUpdate(
      req.params.id,
      { 
        name: title, // name을 title과 동일하게 설정
        title, 
        content, 
        thumbnailUrl, 
        capacity, 
        equipment, 
        status 
      },
      { new: true }
    );
    if (!updatedSpace) {
      return res.status(404).json({ error: 'Space not found' });
    }
    res.json(updatedSpace);
  } catch (error) {
    console.error('Space update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete space by ID
app.delete('/api/spaces/:id', async (req, res) => {
  try {
    const space = await Space.findByIdAndDelete(req.params.id);
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    res.json({ message: 'Space deleted successfully' });
  } catch (error) {
    console.error('Space delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single space by ID
app.get('/api/spaces/:id', async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }
    res.json(space);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 }); // 최신순 정렬
    res.json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new notice
app.post('/api/notices', async (req, res) => {
  try {
    const { title, content, author, category, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newNotice = new Notice({
      title,
      content,
      author: author || 'Admin',
      createdAt: new Date(),
      category: category || 'general',
      status: status || 'published'
    });

    const savedNotice = await newNotice.save();
    res.status(201).json(savedNotice);
  } catch (error) {
    console.error('Notice creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update notice by ID
app.put('/api/notices/:id', async (req, res) => {
  try {
    const { title, content, author, category, status } = req.body;

    const updateData = {
      title,
      content,
      author,
      category,
      status
    };

    // undefined 값들을 제거
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const notice = await Notice.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    res.json(notice);
  } catch (error) {
    console.error('Notice update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete notice by ID
app.delete('/api/notices/:id', async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Notice delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// About API endpoints
app.get('/api/about', async (req, res) => {
  try {
    const about = await About.findOne();
    if (!about) {
      // 기본값 반환
      return res.json({
        title: "디지털 캔버스",
        description: "창의적인 디지털 아트와 기술을 배우는 공간입니다.",
        mission: "디지털 시대의 창작자들을 위한 교육과 협업의 플랫폼을 제공합니다.",
        vision: "모든 사람이 디지털 기술을 통해 자신만의 창작물을 만들 수 있는 세상을 만듭니다.",
        contact: {
          address: "서울시 강남구 테헤란로 123",
          phone: "02-1234-5678",
          email: "info@digitalcanvas.kr"
        },
        established: "2024",
        facilities: [
          "이메리얼룸01",
          "이메리얼룸02", 
          "창작방앗간",
          "공존",
          "메이커스페이스"
        ]
      });
    }
    res.json(about);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update about information
app.put('/api/about', async (req, res) => {
  try {
    const {
      title,
      description,
      mission,
      vision,
      contact,
      established,
      facilities,
      mainText,
      subText,
      btn1,
      btn2,
      btn1Link,
      btn2Link,
      mainImage,
      content
    } = req.body;

    // 기존 About 문서 찾기 또는 새로 생성
    let about = await About.findOne();
    
    if (!about) {
      // 새 문서 생성
      about = new About({
        title: title || "디지털 캔버스",
        description: description || "창의적인 디지털 아트와 기술을 배우는 공간입니다.",
        mission: mission || "디지털 시대의 창작자들을 위한 교육과 협업의 플랫폼을 제공합니다.",
        vision: vision || "모든 사람이 디지털 기술을 통해 자신만의 창작물을 만들 수 있는 세상을 만듭니다.",
        contact: contact || {
          address: "서울시 강남구 테헤란로 123",
          phone: "02-1234-5678",
          email: "info@digitalcanvas.kr"
        },
        established: established || "2024",
        facilities: facilities || [
          "이메리얼룸01",
          "이메리얼룸02", 
          "창작방앗간",
          "공존",
          "메이커스페이스"
        ],
        mainText,
        subText,
        btn1,
        btn2,
        btn1Link,
        btn2Link,
        mainImage,
        content
      });
    } else {
      // 기존 문서 업데이트
      if (title !== undefined) about.title = title;
      if (description !== undefined) about.description = description;
      if (mission !== undefined) about.mission = mission;
      if (vision !== undefined) about.vision = vision;
      if (contact !== undefined) about.contact = contact;
      if (established !== undefined) about.established = established;
      if (facilities !== undefined) about.facilities = facilities;
      if (mainText !== undefined) about.mainText = mainText;
      if (subText !== undefined) about.subText = subText;
      if (btn1 !== undefined) about.btn1 = btn1;
      if (btn2 !== undefined) about.btn2 = btn2;
      if (btn1Link !== undefined) about.btn1Link = btn1Link;
      if (btn2Link !== undefined) about.btn2Link = btn2Link;
      if (mainImage !== undefined) about.mainImage = mainImage;
      if (content !== undefined) about.content = content;
    }

    const savedAbout = await about.save();
    res.json(savedAbout);
  } catch (error) {
    console.error('About update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single notice by ID
app.get('/api/notices/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    res.json(notice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedules API routes
app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await Schedule.find().populate('userId', 'username name');
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new schedule/reservation
app.post('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const { title, start, end, type, spaces, equipment, notes } = req.body;

    // 필수 필드 검증
    if (!title || !start || !end) {
      return res.status(400).json({ error: 'Title, start, and end times are required' });
    }

    // 시간 검증
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const newSchedule = new Schedule({
      title,
      start: startDate,
      end: endDate,
      type: type || 'space',
      spaces: spaces || [],
      equipment: equipment || [],
      userId: req.user.userId,
      notes: notes || ''
    });

    const savedSchedule = await newSchedule.save();
    const populatedSchedule = await Schedule.findById(savedSchedule._id).populate('userId', 'username name');
    
    res.status(201).json(populatedSchedule);
  } catch (error) {
    console.error('Schedule creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete schedule by ID
app.delete('/api/schedules/:id', authenticateToken, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // 권한 확인 - 본인의 예약이거나 관리자인 경우만 삭제 가능
    if (schedule.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You can only delete your own reservations.' });
    }

    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Schedule deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get schedule by ID
app.get('/api/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id).populate('userId', 'username name');
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
