# Render.com 환경 변수 업데이트 가이드

## 새 MongoDB URI

```
mongodb+srv://nuchnuchstudio_db_user:Mc152615@cluster0.jn9iv8r.mongodb.net/test?retryWrites=true&w=majority
```

## Render.com에서 환경 변수 업데이트 방법

### 1단계: Render.com 대시보드 접속
1. [Render.com](https://dashboard.render.com/)에 로그인
2. "Services" 메뉴에서 백엔드 서비스 선택 (digitalcanvas-kuq1 또는 해당 서비스)

### 2단계: 환경 변수 설정
1. 서비스 페이지에서 왼쪽 메뉴의 **"Environment"** 클릭
2. **"Environment Variables"** 섹션에서 `MONGODB_URI` 찾기
3. **"Edit"** 또는 **"Add"** 버튼 클릭
4. 다음 값으로 업데이트:

**변수 이름:**
```
MONGODB_URI
```

**변수 값:**
```
mongodb+srv://nuchnuchstudio_db_user:Mc152615@cluster0.jn9iv8r.mongodb.net/test?retryWrites=true&w=majority
```

### 3단계: 서비스 재배포
1. 환경 변수 저장 후 자동으로 재배포가 시작됩니다
2. 또는 수동으로 **"Manual Deploy"** → **"Deploy latest commit"** 클릭

### 4단계: 연결 확인
재배포 완료 후 다음 URL로 확인:
- Health Check: `https://digitalcanvas-kuq1.onrender.com/health`
- 또는: `https://www.knuh-ditdo.kr/health`

## MongoDB Atlas Network Access 확인

새 클러스터에서 Render.com의 IP를 허용해야 합니다:

1. [MongoDB Atlas](https://cloud.mongodb.com/)에 로그인
2. 새 클러스터 선택 (`cluster0.jn9iv8r.mongodb.net`)
3. **"Network Access"** 메뉴로 이동
4. **"Add IP Address"** 클릭
5. **"Allow Access from Anywhere"** (0.0.0.0/0) 선택 또는 Render.com IP 추가
6. **"Confirm"** 클릭

## 문제 해결

### 연결 오류가 계속 발생하는 경우:
1. MongoDB Atlas의 Network Access 설정 확인
2. Database User 권한 확인
3. Render.com 로그 확인: 서비스 페이지 → **"Logs"** 탭
4. 환경 변수가 올바르게 설정되었는지 확인

### 로그 확인 명령어 (Render.com 대시보드):
- 서비스 페이지 → **"Logs"** 탭에서 실시간 로그 확인
- MongoDB 연결 오류 메시지 확인

