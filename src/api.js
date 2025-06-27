import axios from 'axios';

// Render 백엔드 배포 주소
const PROD_URL = 'https://digitalcanvas-kuq1.onrender.com';

// 현재 환경이 프로덕션(배포) 환경인지 확인
const isProduction = process.env.NODE_ENV === 'production';

// API 클라이언트 생성
const api = axios.create({
  // 프로덕션 환경에서는 Render 주소를, 개발 환경에서는 로컬 프록시를 사용
  baseURL: isProduction ? PROD_URL : '/', 
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