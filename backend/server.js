const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Telegram 메시지 전송 함수
const sendTelegramMessage = (message) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram configuration missing');
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const postData = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
  });

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${botToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error('Telegram API error:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error sending Telegram message:', e);
  });

  req.write(postData);
  req.end();
};

// Redirect www to naked domain (네이버 지도 API 도메인 인증용)
app.use((req, res, next) => {
  if (req.headers.host === 'www.knuh-ditdo.kr') {
    return res.redirect(301, 'https://knuh-ditdo.kr' + req.originalUrl);
  }
  next();
});

// JWT Secret (환경변수에서 가져오거나 기본값 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware - CORS 완전 개방
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection (with connection pool)
// 개발 환경에서는 연결 완료 후 서버 시작
let mongoConnected = false;

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5, // 동시에 최대 5개 커넥션 유지 (비용 절감)
      minPoolSize: 1, // 최소 1개 커넥션 유지
      serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃 5초
      socketTimeoutMS: 45000, // 소켓 타임아웃 45초
      connectTimeoutMS: 10000, // 연결 타임아웃 10초
    });
    mongoConnected = true;
    console.log('Successfully connected to MongoDB (with connection pool)');

    // 성능 최적화: 인덱스 생성 (이미 존재하면 무시됨)
    try {
      const db = mongoose.connection.db;
      await db.collection('schedules').createIndex({ start: 1 });
      await db.collection('schedules').createIndex({ end: 1 });
      await db.collection('schedules').createIndex({ start: 1, end: 1 });
      console.log('Database indexes ensured for schedules collection');
    } catch (indexErr) {
      console.log('Index creation skipped or already exists:', indexErr.message);
    }

    return true;
  } catch (err) {
    console.error('Could not connect to MongoDB', err);
    // 개발 환경에서는 연결 실패 시 서버 시작 중단
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
    return false;
  }
};

// MongoDB 연결 상태 확인 미들웨어 (선택적)
const checkMongoConnection = (req, res, next) => {
  if (!mongoConnected && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database connection not ready',
      message: '서버가 데이터베이스에 연결 중입니다. 잠시 후 다시 시도해주세요.'
    });
  }
  next();
};

// Health check endpoint (최적화: 빠른 응답을 위해 최소한의 데이터만 반환)
app.get('/health', (req, res) => {
  // MongoDB 연결 상태 확인 없이 즉시 응답 (cold start 시간 단축)
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
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

// 인덱스 추가
programSchema.index({ startDate: -1 }); // 시작일 기준 정렬 최적화
programSchema.index({ status: 1 }); // 상태별 필터링 최적화

const spaceSchema = new mongoose.Schema({
  _id: String, // _id를 String으로 명시
  title: String,
  content: String,
  thumbnailUrl: String,
  capacity: Number,
  equipment: [String],
  status: String
}, { collection: 'spaces', _id: true }); // spaces 컬렉션 명시

const noticeSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  createdAt: Date,
  category: String,
  status: String
}, { collection: 'notices' }); // notices 컬렉션 명시

// 인덱스 추가
noticeSchema.index({ createdAt: -1 }); // 최신순 정렬 최적화
noticeSchema.index({ status: 1 }); // 상태별 필터링 최적화

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
  snsLink: String,
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

// 인덱스 추가 (쿼리 성능 향상 및 비용 절감)
scheduleSchema.index({ start: 1 }); // 날짜 범위 쿼리 최적화
scheduleSchema.index({ end: 1 }); // 종료일 기준 쿼리 최적화
scheduleSchema.index({ createdAt: -1 }); // 최신순 정렬 최적화
scheduleSchema.index({ userId: 1 }); // 사용자별 조회 최적화
scheduleSchema.index({ status: 1 }); // 상태별 필터링 최적화

// Popup Schema
const popupSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  imageUrl: String, // 하위 호환성을 위해 유지
  imageUrls: [String], // 여러 이미지 지원
  isActive: { type: Boolean, default: true },
  startDate: Date,
  endDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'popups' });

// 인덱스 추가
popupSchema.index({ isActive: 1, startDate: 1, endDate: 1 }); // 활성 팝업 조회 최적화
popupSchema.index({ createdAt: -1 }); // 최신순 정렬 최적화

// MongoDB Models
const Program = mongoose.model('Program', programSchema, 'program'); // program 컬렉션
const Space = mongoose.model('Space', spaceSchema, 'spaces'); // spaces 컬렉션
const Notice = mongoose.model('Notice', noticeSchema, 'notices'); // notices 컬렉션
const About = mongoose.model('About', aboutSchema, 'abouts');
const User = mongoose.model('User', userSchema, 'users');
const Schedule = mongoose.model('Schedule', scheduleSchema, 'schedules');
const Popup = mongoose.model('Popup', popupSchema, 'popups');

// API for About section (Main page content)
app.get('/api/abouts', async (req, res) => {
  try {
    // abouts 컬렉션은 문서가 하나만 있을 것으로 가정
    // lean() 사용으로 Mongoose 문서 대신 일반 객체 반환 (성능 향상)
    const aboutData = await About.findOne().lean();
    if (!aboutData) {
      return res.status(404).json({ message: 'About data not found.' });
    }
    res.json(aboutData);
  } catch (error) {
    console.error('About API error:', error);
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

// TrainedUser Schema (교육 이수자)
const trainedUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  equipmentType: { type: String, required: true, enum: ['3d-printer-01', '3d-printer-02', 'laser-engraver'] },
  registeredAt: { type: Date, default: Date.now },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { collection: 'resistorName' });

const TrainedUser = mongoose.model('TrainedUser', trainedUserSchema);

// ReservationOption Schema (예약 항목 관리)
const reservationOptionSchema = new mongoose.Schema({
  value: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  category: { type: String, required: true, enum: ['space', 'equipment', 'makerspace'] },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { collection: 'reservationOptions' });

const ReservationOption = mongoose.model('ReservationOption', reservationOptionSchema);

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
    // 필요한 필드만 선택하여 데이터 전송량 감소
    const programs = await Program.find()
      .select('title thumbnailUrl description startDate endDate instructor maxParticipants currentParticipants category status')
      .sort({ _id: -1 }) // 최신순 정렬
      .limit(100); // 최대 100개로 제한
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
    // _id가 String으로 저장되어 있으므로 직접 MongoDB 드라이버 사용
    const db = mongoose.connection.db;
    const program = await db.collection('program').findOne({ _id: req.params.id });
    
    if (!program) {
      console.error(`[DEBUG] Program not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Program not found' });
    }
    res.json(program);
  } catch (error) {
    console.error('Error fetching program:', error);
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
    // 필요한 필드만 선택하여 데이터 전송량 감소
    const spaces = await Space.find()
      .select('title thumbnailUrl capacity equipment status')
      .limit(100); // 최대 100개로 제한
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
    // _id가 String으로 저장되어 있으므로 직접 MongoDB 드라이버 사용
    const db = mongoose.connection.db;
    const space = await db.collection('spaces').findOne({ _id: req.params.id });
    
    if (!space) {
      console.error(`[DEBUG] Space not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Space not found' });
    }
    res.json(space);
  } catch (error) {
    console.error('Error fetching space:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notices', async (req, res) => {
  try {
    // 필요한 필드만 선택하여 데이터 전송량 감소
    const notices = await Notice.find()
      .select('title author createdAt category status')
      .sort({ createdAt: -1 }) // 최신순 정렬
      .limit(100); // 최대 100개로 제한
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
    // _id가 String으로 저장되어 있으므로 직접 MongoDB 드라이버 사용
    const db = mongoose.connection.db;
    const notice = await db.collection('notices').findOne({ _id: req.params.id });
    
    if (!notice) {
      console.error(`[DEBUG] Notice not found with ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Notice not found' });
    }
    res.json(notice);
  } catch (error) {
    console.error('Error fetching notice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedules API routes
app.get('/api/schedules', async (req, res) => {
  try {
    const { start, end, limit } = req.query;
    
    // 날짜 범위 필터링 조건 생성
    // start 필드가 문자열로 저장된 경우도 처리 (ISO 문자열은 사전식 정렬 가능)
    // start 필드가 없는 데이터도 포함 (다른 스키마 형식 지원)
    let dateFilter = {};
    
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      // 문자열과 Date 모두 처리, start 필드가 없는 데이터도 포함
      dateFilter = {
        $or: [
          { start: { $gte: startDate, $lte: endDate } },
          { start: { $gte: startDateStr, $lte: endDateStr } },
          { start: { $exists: false } },
          { start: null }
        ]
      };
    } else if (start) {
      const startDate = new Date(start);
      const startDateStr = startDate.toISOString();
      dateFilter = {
        $or: [
          { start: { $gte: startDate } },
          { start: { $gte: startDateStr } },
          { start: { $exists: false } },
          { start: null }
        ]
      };
    } else if (end) {
      const endDate = new Date(end);
      const endDateStr = endDate.toISOString();
      dateFilter = {
        $or: [
          { start: { $lte: endDate } },
          { start: { $lte: endDateStr } },
          { start: { $exists: false } },
          { start: null }
        ]
      };
    } else {
      // start/end 파라미터가 없으면 모든 데이터 조회 (test 데이터베이스의 schedules 컬렉션 전체)
      // start 필드가 없는 데이터도 포함
      dateFilter = {
        $or: [
          { start: { $exists: true, $ne: null } }, // start 필드가 있는 모든 데이터
          { start: { $exists: false } }, // start 필드가 없는 데이터
          { start: null } // start가 null인 데이터
        ]
      };
    }
    
    // 쿼리 생성 - Mongoose find()에 직접 조건 전달
    let query = Schedule.find(dateFilter);
    
    // populate 최소화 - 필요한 경우에만 사용
    // userId가 있는 경우에만 populate (빈 참조 populate 방지)
    // match 조건 제거: match는 참조된 문서를 필터링하므로 원본 문서가 사라질 수 있음
    query = query.populate({
      path: 'userId',
      select: 'username name'
    });
    
    // 정렬 및 제한
    // start 필드가 문자열인 경우도 정렬 가능 (ISO 형식)
    // start 필드가 없는 경우 createdAt으로 정렬
    query = query.sort({ start: 1, createdAt: -1 }).limit(limit ? parseInt(limit) : 10000);
    
    const schedules = await query;
    
    // 디버깅: 쿼리 결과 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] /api/schedules - dateFilter:`, JSON.stringify(dateFilter));
      console.log(`[DEBUG] /api/schedules - 결과 개수:`, schedules.length);
    }
    
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new schedule/reservation (no authentication required for public reservations)
app.post('/api/schedules', async (req, res) => {
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

    const scheduleData = {
      title,
      start: startDate,
      end: endDate,
      type: type || 'space',
      spaces: spaces || [],
      equipment: equipment || [],
      notes: notes || ''
    };

    // 로그인한 경우에만 userId 추가
    if (req.user && req.user.userId) {
      scheduleData.userId = req.user.userId;
    }

    const newSchedule = new Schedule(scheduleData);

    const savedSchedule = await newSchedule.save();

    // Telegram 메시지 전송
    const notesObj = notes ? JSON.parse(notes) : {};
    const userName = notesObj.name || 'Unknown';
    const userDept = notesObj.department || '-';
    const userContact = notesObj.contact || '-';
    const startTime = new Date(startDate).toLocaleString('ko-KR');
    const endTime = new Date(endDate).toLocaleString('ko-KR');

    let reservationDetails = '';
    if (notesObj.spaceTypes && notesObj.spaceTypes.length > 0) {
      reservationDetails += `🏢 공간: ${notesObj.spaceTypes.join(', ')}\n`;
    }
    if (notesObj.equipmentTypes && notesObj.equipmentTypes.length > 0) {
      reservationDetails += `🔧 장비: ${notesObj.equipmentTypes.join(', ')}\n`;
    }
    if (notesObj.makerSpaceTypes && notesObj.makerSpaceTypes.length > 0) {
      reservationDetails += `🛠️ 메이커스페이스: ${notesObj.makerSpaceTypes.join(', ')}\n`;
    }

    const telegramMessage = `
<b>📍 새로운 예약이 들어왔습니다!</b>

<b>예약자 정보</b>
👤 이름: ${userName}
🏫 소속: ${userDept}
📱 연락처: ${userContact}

<b>예약 정보</b>
📅 시작: ${startTime}
📅 종료: ${endTime}
${reservationDetails}
    `.trim();

    sendTelegramMessage(telegramMessage);

    // userId가 있으면 populate, 없으면 그냥 반환
    if (savedSchedule.userId) {
      const populatedSchedule = await Schedule.findById(savedSchedule._id).populate('userId', 'username name');
      res.status(201).json(populatedSchedule);
    } else {
      res.status(201).json(savedSchedule);
    }
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

    // 권한 확인 - userId가 있으면 본인의 예약이거나 관리자인 경우만 삭제 가능
    if (schedule.userId) {
      if (schedule.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. You can only delete your own reservations.' });
      }
    }
    // userId가 없는 예약(공개 예약)은 로그인한 사용자 누구나 삭제 가능

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

// Popup API routes
// Get all popups
app.get('/api/popups', async (req, res) => {
  try {
    // 필요한 필드만 선택하여 데이터 전송량 감소
    const popups = await Popup.find()
      .select('title message imageUrl imageUrls isActive startDate endDate createdAt')
      .populate('createdBy', 'username name')
      .sort({ createdAt: -1 })
      .limit(100); // 최대 100개로 제한
    res.json(popups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active popup
app.get('/api/popups/active', async (req, res) => {
  try {
    const now = new Date();
    // lean() 사용으로 성능 향상 및 인덱스 활용
    const activePopup = await Popup.findOne({
      isActive: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: null, endDate: null }
      ]
    })
    .sort({ createdAt: -1 })
    .lean(); // Mongoose 문서 대신 일반 객체 반환
    
    res.json(activePopup || null); // null 반환으로 일관성 유지
  } catch (error) {
    console.error('Active popup API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single popup by ID
app.get('/api/popups/:id', async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id).populate('createdBy', 'username name');
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    res.json(popup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new popup (requires authentication)
app.post('/api/popups', authenticateToken, async (req, res) => {
  try {
    const { title, message, imageUrl, imageUrls, isActive, startDate, endDate } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const newPopup = new Popup({
      title,
      message,
      imageUrl: imageUrl || '',
      imageUrls: imageUrls || [],
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.user.userId
    });

    const savedPopup = await newPopup.save();
    const populatedPopup = await Popup.findById(savedPopup._id).populate('createdBy', 'username name');
    
    res.status(201).json(populatedPopup);
  } catch (error) {
    console.error('Popup creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update popup by ID (requires authentication)
app.put('/api/popups/:id', authenticateToken, async (req, res) => {
  try {
    const { title, message, imageUrl, imageUrls, isActive, startDate, endDate } = req.body;

    const updateData = {
      title,
      message,
      imageUrl,
      imageUrls: imageUrls || [],
      isActive,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      updatedAt: new Date()
    };

    // undefined 값들을 제거 (빈 배열은 유지)
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const popup = await Popup.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('createdBy', 'username name');
    
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    res.json(popup);
  } catch (error) {
    console.error('Popup update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete popup by ID (requires authentication)
app.delete('/api/popups/:id', authenticateToken, async (req, res) => {
  console.log('[DEBUG] DELETE /api/popups/:id 호출됨, id:', req.params.id);
  try {
    const id = req.params.id;

    // 먼저 Mongoose로 시도 (ObjectId인 경우)
    let popup = await Popup.findByIdAndDelete(id);

    // 못 찾으면 네이티브 MongoDB로 문자열 _id 시도
    if (!popup) {
      const db = mongoose.connection.db;
      const result = await db.collection('popups').findOneAndDelete({ _id: id });
      popup = result.value || result;
    }

    console.log('[DEBUG] 팝업 삭제 결과:', popup ? '성공' : '찾을 수 없음');
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    res.json({ message: 'Popup deleted successfully' });
  } catch (error) {
    console.error('Popup delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Reservation Options (예약 항목 관리) API ==========

// Get all reservation options
app.get('/api/reservation-options', async (req, res) => {
  try {
    const { category } = req.query;
    
    // DB에서 가져온 항목
    const query = category ? { category, isActive: true } : { isActive: true };
    const dbOptions = await ReservationOption.find(query).sort({ label: 1 });

    // 기본 내장 항목들
    const defaultOptions = {
      space: [
        { value: 'emeral-room-01', label: '이메리얼룸01', category: 'space', isDefault: true },
        { value: 'emeral-room-02', label: '이메리얼룸02', category: 'space', isDefault: true },
        { value: 'creative-workshop', label: '창작방앗간', category: 'space', isDefault: true },
        { value: 'coexistence', label: '공존', category: 'space', isDefault: true },
        { value: 'closed', label: '휴관', category: 'space', isDefault: true }
      ],
      equipment: [
        { value: 'nikon-dslr', label: '니콘 DSLR 카메라', category: 'equipment', isDefault: true },
        { value: 'sony-camcorder', label: '소니 캠코더', category: 'equipment', isDefault: true },
        { value: '360-camera', label: '360 카메라(교내연구소만 가능)', category: 'equipment', isDefault: true },
        { value: 'led-light', label: 'LED 조명', category: 'equipment', isDefault: true },
        { value: 'zoom-recorder', label: '줌 사운드 레코더', category: 'equipment', isDefault: true },
        { value: 'microphone', label: '현장답사용 마이크리시버', category: 'equipment', isDefault: true },
        { value: 'electronic-board', label: '전자칠판', category: 'equipment', isDefault: true },
        { value: 'laptop', label: '노트북', category: 'equipment', isDefault: true }
      ],
      makerspace: (() => {
        // 2025년 1월 1일부터 3D프린터02 추가
        const currentDate = new Date();
        const january2025 = new Date(2025, 0, 1); // 2025년 1월 1일
        const isAfterJanuary2025 = currentDate >= january2025;
        
        const baseOptions = [
          { value: '3d-printer-01', label: '3D프린터01', category: 'makerspace', isDefault: true },
          { value: 'laser-engraver', label: '레이저각인기', category: 'makerspace', isDefault: true }
        ];
        
        if (isAfterJanuary2025) {
          baseOptions.push({ value: '3d-printer-02', label: '3D프린터02', category: 'makerspace', isDefault: true });
        }
        
        return baseOptions;
      })()
    };

    // 카테고리별로 기본 항목과 DB 항목 합치기
    let allOptions = [];
    if (category) {
      const defaults = defaultOptions[category] || [];
      allOptions = [...defaults, ...dbOptions];
    } else {
      allOptions = [...defaultOptions.space, ...defaultOptions.equipment, ...defaultOptions.makerspace, ...dbOptions];
    }

    // 이름순 정렬
    allOptions.sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'));

    res.json(allOptions);
  } catch (error) {
    console.error('Reservation options fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create reservation option (requires authentication)
app.post('/api/reservation-options', authenticateToken, async (req, res) => {
  try {
    const { value, label, category } = req.body;

    if (!value || !label || !category) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const option = new ReservationOption({
      value,
      label,
      category,
      createdBy: req.user.userId
    });

    await option.save();
    res.status(201).json(option);
  } catch (error) {
    console.error('Reservation option creation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: '이미 존재하는 항목입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete reservation option (requires authentication)
app.delete('/api/reservation-options/:id', authenticateToken, async (req, res) => {
  try {
    const option = await ReservationOption.findByIdAndDelete(req.params.id);
    if (!option) {
      return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    }
    res.json({ message: '항목이 삭제되었습니다.' });
  } catch (error) {
    console.error('Reservation option delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Trained Users (교육 이수자) API ==========

// Get all trained users
app.get('/api/trained-users', async (req, res) => {
  try {
    const trainedUsers = await TrainedUser.find().sort({ registeredAt: -1 });
    res.json(trainedUsers);
  } catch (error) {
    console.error('Trained users fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trained users by equipment type
app.get('/api/trained-users/:equipmentType', async (req, res) => {
  try {
    const equipmentType = req.params.equipmentType;
    
    // '3d-printer'일 경우 3d-printer로 시작하는 모든 장비 포함 (01, 02 등)
    const query = equipmentType === '3d-printer' 
      ? { equipmentType: { $regex: '^3d-printer' } }
      : { equipmentType: equipmentType };
    
    const trainedUsers = await TrainedUser.find(query).sort({ registeredAt: -1 });
    res.json(trainedUsers);
  } catch (error) {
    console.error('Trained users fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if user is trained for specific equipment
app.post('/api/trained-users/check', async (req, res) => {
  try {
    const { name, equipmentType } = req.body;
    
    // 이름 앞뒤 공백 제거 및 정규화
    const normalizedName = name ? name.trim() : '';
    
    // 3D프린터 01 또는 02인 경우, 둘 중 하나라도 이수했으면 허용
    if (equipmentType === '3d-printer-01' || equipmentType === '3d-printer-02') {
      // 이름으로 검색 (공백 제거된 이름으로 검색)
      const trainedUser = await TrainedUser.findOne({
        name: normalizedName,
        equipmentType: { $in: ['3d-printer-01', '3d-printer-02'] }
      });
      
      // 디버깅 로그
      console.log(`[이수자 체크] 이름: "${normalizedName}", 장비: ${equipmentType}, 결과: ${trainedUser ? '이수함' : '이수 안함'}`);
      if (trainedUser) {
        console.log(`[이수자 체크] 찾은 이수자 - 이름: "${trainedUser.name}", 장비: ${trainedUser.equipmentType}`);
      } else {
        // 이수자가 없을 때 유사한 이름이 있는지 확인 (디버깅용)
        const similarUsers = await TrainedUser.find({
          equipmentType: { $in: ['3d-printer-01', '3d-printer-02'] },
          name: { $regex: normalizedName.replace(/\s+/g, '.*'), $options: 'i' }
        }).limit(3);
        if (similarUsers.length > 0) {
          console.log(`[이수자 체크] 유사한 이름 발견:`, similarUsers.map(u => `"${u.name}"`).join(', '));
        }
      }
      
      res.json({ isTrained: !!trainedUser });
    } else {
      // 다른 장비는 기존 로직대로 정확히 일치하는 것만 확인
      const trainedUser = await TrainedUser.findOne({ 
        name: normalizedName, 
        equipmentType 
      });
      res.json({ isTrained: !!trainedUser });
    }
  } catch (error) {
    console.error('Trained user check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register trained user (requires authentication)
app.post('/api/trained-users', authenticateToken, async (req, res) => {
  try {
    const { name, equipmentType } = req.body;

    if (!name || !equipmentType) {
      return res.status(400).json({ error: '이름과 장비 유형을 입력해주세요.' });
    }

    // 중복 확인
    const existing = await TrainedUser.findOne({ name, equipmentType });
    if (existing) {
      return res.status(400).json({ error: '이미 등록된 이수자입니다.' });
    }

    const trainedUser = new TrainedUser({
      name,
      equipmentType,
      registeredBy: req.user.userId
    });

    await trainedUser.save();
    res.status(201).json(trainedUser);
  } catch (error) {
    console.error('Trained user registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete trained user (requires authentication)
app.delete('/api/trained-users/:id', authenticateToken, async (req, res) => {
  try {
    const trainedUser = await TrainedUser.findByIdAndDelete(req.params.id);
    if (!trainedUser) {
      return res.status(404).json({ error: '이수자를 찾을 수 없습니다.' });
    }
    res.json({ message: '이수자가 삭제되었습니다.' });
  } catch (error) {
    console.error('Trained user delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 지난 달 예약 데이터의 개인정보 삭제 (매일 자정 실행)
// 최적화: 배치 업데이트 사용 및 필요한 필드만 조회
const cleanupOldReservations = async () => {
  try {
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 이번 달 이전의 예약들 찾기 (notes 필드만 선택하여 데이터 전송량 감소)
    const oldReservations = await Schedule.find({
      start: { $lt: firstDayOfCurrentMonth },
      notes: { $exists: true, $ne: null, $ne: '' } // notes가 있는 것만
    }).select('_id notes').lean(); // lean() 사용으로 메모리 사용량 감소

    if (oldReservations.length === 0) {
      console.log('No old reservations to clean up');
      return;
    }

    // 배치 업데이트를 위한 배열 준비
    const bulkOps = [];
    
    for (const reservation of oldReservations) {
      try {
        const notes = JSON.parse(reservation.notes || '{}');
        let hasChanges = false;
        
        // 개인정보 삭제
        if (notes.department) {
          delete notes.department;
          hasChanges = true;
        }
        if (notes.contact) {
          delete notes.contact;
          hasChanges = true;
        }
        
        // 변경사항이 있으면 bulkOps에 추가
        if (hasChanges) {
          bulkOps.push({
            updateOne: {
              filter: { _id: reservation._id },
              update: { $set: { notes: JSON.stringify(notes) } }
            }
          });
        }
      } catch (e) {
        // notes가 JSON이 아닌 경우는 그냥 넘어감
        continue;
      }
    }

    // 배치 업데이트 실행 (단일 쿼리로 모든 업데이트 수행)
    if (bulkOps.length > 0) {
      await Schedule.bulkWrite(bulkOps);
      console.log(`Cleaned up personal info from ${bulkOps.length} old reservations`);
    } else {
      console.log('No personal info to clean up');
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// 서버 시작 시 한 번 실행
cleanupOldReservations();

// 매일 자정에 실행 (밀리초 단위)
const scheduleCleanup = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow - now;
  
  setTimeout(() => {
    cleanupOldReservations();
    // 다음 날 자정을 위해 다시 스케줄링
    setInterval(cleanupOldReservations, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
};

scheduleCleanup();

// Keep-alive: Render 무료 플랜 sleep 방지 (14분마다 자체 ping)
const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
let keepAliveInterval = null;

const startKeepAlive = () => {
  if (process.env.NODE_ENV === 'production' && KEEP_ALIVE_URL) {
    keepAliveInterval = setInterval(async () => {
      try {
        const https = require('https');
        const http = require('http');
        const url = new URL(KEEP_ALIVE_URL + '/health');
        const client = url.protocol === 'https:' ? https : http;

        client.get(url, (res) => {
          console.log(`[Keep-Alive] Ping sent at ${new Date().toISOString()} - Status: ${res.statusCode}`);
        }).on('error', (err) => {
          console.log(`[Keep-Alive] Ping failed: ${err.message}`);
        });
      } catch (err) {
        console.log(`[Keep-Alive] Error: ${err.message}`);
      }
    }, 14 * 60 * 1000); // 14분마다 (Render는 15분 후 sleep)
    console.log('Keep-alive scheduler activated (every 14 minutes)');
  }
};

// 서버 시작 - MongoDB 연결 완료 후 시작
(async () => {
  try {
    await connectMongoDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Personal info cleanup scheduler activated');
      startKeepAlive();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
