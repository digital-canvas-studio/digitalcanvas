const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://knuh:knuh7189@cluster0.czi1fpr.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Successfully connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Schemas
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
}, { collection: 'program' }); // server.js와 동일한 컬렉션 사용

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
  // 메인페이지용 필드들
  mainText: String,
  subText: String,
  btn1: String,
  btn2: String,
  btn1Link: String,
  btn2Link: String,
  mainImage: String,
  content: String
}, { collection: 'abouts' }); // abouts 콜렉션 사용

// Models
const Program = mongoose.model('Program', programSchema, 'program');
const Space = mongoose.model('Space', spaceSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const About = mongoose.model('About', aboutSchema, 'abouts');

async function seedData() {
  try {
    // Clear existing data
    await Program.deleteMany({});
    await Space.deleteMany({});
    await Notice.deleteMany({});
    await About.deleteMany({});

    // Add sample programs
    const programs = [
      {
        title: "AI 아트 워크숍",
        content: "인공지능을 활용한 디지털 아트 창작 워크숍입니다. 최신 AI 도구를 활용하여 창의적인 작품을 만들어보세요.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=AI+Art",
        description: "인공지능을 활용한 디지털 아트 창작 워크숍입니다.",
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-07-31'),
        instructor: "김디지털",
        maxParticipants: 20,
        currentParticipants: 15,
        category: "워크숍",
        status: "진행중"
      },
      {
        title: "3D 모델링 기초",
        content: "Blender를 활용한 3D 모델링 기초 과정입니다. 3D 모델링의 기본부터 실전까지 단계별로 배워보세요.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=3D+Modeling",
        description: "Blender를 활용한 3D 모델링 기초 과정입니다.",
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-08-30'),
        instructor: "박3D",
        maxParticipants: 15,
        currentParticipants: 8,
        category: "교육",
        status: "모집중"
      },
      {
        title: "VR 콘텐츠 제작",
        content: "가상현실 콘텐츠 제작 실습 프로그램입니다. 직접 VR 콘텐츠를 기획하고 제작해보는 실무 중심 과정입니다.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=VR+Content",
        description: "가상현실 콘텐츠 제작 실습 프로그램입니다.",
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-30'),
        instructor: "이VR",
        maxParticipants: 12,
        currentParticipants: 5,
        category: "실습",
        status: "모집중"
      }
    ];

    // Add sample spaces
    const spaces = [
      {
        title: "이메리얼룸01",
        content: "다양한 프레젠테이션과 세미나를 위한 멀티미디어 공간입니다. 프로젝터와 화이트보드가 구비되어 있어 교육과 회의에 최적화되어 있습니다.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=Emereal+Room+01",
        capacity: 20,
        equipment: ["프로젝터", "화이트보드", "컴퓨터"],
        status: "사용가능"
      },
      {
        title: "이메리얼룸02",
        content: "최신 VR 기술을 체험할 수 있는 가상현실 전용 공간입니다. 고성능 PC와 모션캡처 시스템을 갖추고 있습니다.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=Emereal+Room+02",
        capacity: 15,
        equipment: ["VR헤드셋", "고성능PC", "모션캡처"],
        status: "사용가능"
      },
      {
        title: "창작방앗간",
        content: "아이디어를 현실로 만드는 메이커 공간입니다. 3D프린터와 레이저커터 등 다양한 장비로 프로토타입을 제작할 수 있습니다.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=Maker+Space",
        capacity: 25,
        equipment: ["3D프린터", "레이저커터", "작업대"],
        status: "사용가능"
      },
      {
        title: "공존",
        content: "협업과 소통을 위한 공유 공간입니다. 대규모 미팅과 워크숍이 가능한 넓은 공간을 제공합니다.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=Coexistence",
        capacity: 30,
        equipment: ["회의테이블", "스크린", "음향장비"],
        status: "예약중"
      },
      {
        title: "메이커스페이스",
        content: "전자 공작과 하드웨어 프로젝트를 위한 공간입니다. 각종 전자부품과 측정장비가 구비되어 있습니다.",
        thumbnailUrl: "https://via.placeholder.com/300x200?text=Electronics+Lab",
        capacity: 12,
        equipment: ["전자부품", "납땜도구", "측정장비"],
        status: "사용가능"
      }
    ];

    // Add sample notices
    const notices = [
      {
        title: "2024년 하반기 프로그램 모집 안내",
        content: "2024년 하반기 디지털 캔버스 교육 프로그램 모집을 시작합니다.",
        author: "관리자",
        createdAt: new Date(),
        category: "공지",
        status: "게시중"
      },
      {
        title: "시설 이용 안내",
        content: "디지털 캔버스 시설 이용 시 주의사항을 안내드립니다.",
        author: "시설관리팀",
        createdAt: new Date(),
        category: "안내",
        status: "게시중"
      }
    ];

    // Add about data (메인페이지용 데이터)
    const aboutData = {
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
      ],
      // 메인페이지용 필드들
      mainText: "DIGITAL CANVAS",
      subText: "모든 디지털 창작, 한 곳에서.",
      btn1: "공간 둘러보기",
      btn2: "프로그램 보기",
      btn1Link: "/space",
      btn2Link: "/program",
      mainImage: "http://nodetree.cafe24.com/%B5%F0%C1%F6%C5%D0%B5%B5%C8%AD%BC%AD/main.png",
      content: "<h2>디지털도화서란?</h2><p>누구나 자유롭게 창작하고, 디지털로 소통하는 열린 공간입니다.</p><p>아이디어부터 완성까지, 모든 과정을 함께 경험해보세요.</p>"
    };

    // Insert data
    await Program.insertMany(programs);
    await Space.insertMany(spaces);
    await Notice.insertMany(notices);
    await About.create(aboutData);

    console.log('✅ 테스트 데이터가 성공적으로 추가되었습니다!');
    console.log(`- 프로그램: ${programs.length}개`);
    console.log(`- 공간: ${spaces.length}개`);
    console.log(`- 공지사항: ${notices.length}개`);
    console.log('- About(메인페이지) 데이터: 1개');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ 데이터 추가 중 오류 발생:', error);
    mongoose.connection.close();
  }
}

seedData(); 