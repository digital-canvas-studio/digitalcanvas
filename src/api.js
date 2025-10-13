import axios from 'axios';

// Render 백엔드 배포 주소
const PROD_URL = 'https://digitalcanvas-kuq1.onrender.com';

// 현재 환경이 프로덕션(배포) 환경인지 확인
const isProduction = process.env.NODE_ENV === 'production';

// 개발 환경에서도 모바일 접속 시 실제 서버 IP를 사용할 수 있도록
const getBaseURL = () => {
  if (isProduction) {
    return PROD_URL;
  }
  
  // 개발 환경: 현재 호스트 사용 (모바일에서도 작동)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:3001`;
  }
  
  return 'http://localhost:3001';
};

// API 클라이언트 생성
const api = axios.create({
  baseURL: getBaseURL(), 
});

// 요청 인터셉터: 로컬 스토리지에서 토큰을 가져와 모든 요청 헤더에 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;