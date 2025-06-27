# Digital Canvas Backend

Digital Canvas 프로젝트의 백엔드 서버입니다.

## 기술 스택

- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT 인증
- bcryptjs

## 설치 및 실행

### 로컬 개발 환경

1. 의존성 설치:
```bash
npm install
```

2. 환경변수 설정:
`.env.example`을 참고하여 `.env` 파일을 생성하고 필요한 값들을 설정하세요.

3. 개발 서버 실행:
```bash
npm run dev
```

### 프로덕션 배포

1. Render.com에 배포:
   - GitHub 저장소 연결
   - Build Command: `npm install`
   - Start Command: `npm start`

2. 환경변수 설정 (Render 대시보드에서):
   - `MONGODB_URI`: MongoDB 연결 문자열
   - `JWT_SECRET`: JWT 토큰 서명용 비밀키
   - `FRONTEND_URL`: 프론트엔드 도메인 URL
   - `NODE_ENV`: production

## API 엔드포인트

### 인증
- `POST /api/register` - 사용자 등록
- `POST /api/login` - 로그인
- `GET /api/me` - 현재 사용자 정보

### 소개 (About)
- `GET /api/about` - 소개 정보 조회
- `PUT /api/about` - 소개 정보 수정
- `DELETE /api/about` - 소개 정보 초기화

### 공간 (Spaces)
- `GET /api/spaces` - 공간 목록 조회
- `GET /api/spaces/:id` - 특정 공간 조회
- `PUT /api/spaces/:id` - 공간 정보 수정

### 공지사항 (Notices)
- `GET /api/notices` - 공지사항 목록 조회
- `GET /api/notices/:id` - 특정 공지사항 조회
- `POST /api/notices` - 공지사항 생성
- `PUT /api/notices/:id` - 공지사항 수정
- `DELETE /api/notices/:id` - 공지사항 삭제

### 프로그램 (Programs)
- `GET /api/programs` - 프로그램 목록 조회
- `GET /api/programs/:id` - 특정 프로그램 조회
- `POST /api/programs` - 프로그램 생성 (인증 필요)
- `PUT /api/programs/:id` - 프로그램 수정
- `DELETE /api/programs/:id` - 프로그램 삭제

### 예약 (Schedules)
- `GET /api/schedules` - 예약 목록 조회
- `POST /api/schedules` - 예약 생성 (인증 필요)
- `DELETE /api/schedules/:id` - 예약 삭제 (인증 필요)

## 헬스체크

- `GET /health` - 서버 상태 확인 