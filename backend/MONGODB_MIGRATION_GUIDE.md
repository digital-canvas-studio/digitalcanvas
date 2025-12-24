# MongoDB 유료 → 무료 버전 마이그레이션 가이드

이 가이드는 MongoDB Atlas를 유료 버전에서 무료 버전으로 전환하는 과정을 안내합니다.

## 사전 준비

1. **MongoDB Database Tools 설치**
   ```bash
   # macOS
   brew install mongodb-database-tools
   
   # 또는 직접 다운로드
   # https://www.mongodb.com/try/download/database-tools
   ```

2. **현재 MongoDB 연결 정보 확인**
   - `.env` 파일의 `MONGODB_URI` 확인
   - 현재 데이터베이스 이름: `test`

## 단계별 가이드

### 1단계: 기존 데이터 백업

```bash
cd backend
node backup-db.js
```

백업이 완료되면 `backend/backups/` 디렉토리에 백업 파일이 생성됩니다.

**백업 파일 위치 예시:**
```
backend/backups/backup_test_2024-01-15_12-30-00/test/
```

### 2단계: 백업 파일 압축 (선택사항)

```bash
cd backend/backups
tar -czf backup_test_2024-01-15_12-30-00.tar.gz backup_test_2024-01-15_12-30-00
```

### 3단계: MongoDB Atlas에서 새 무료 클러스터 생성

1. [MongoDB Atlas](https://cloud.mongodb.com/)에 로그인
2. "Create" 또는 "Build a Database" 클릭
3. **Free (M0) 티어 선택**
4. 클라우드 제공자 및 리전 선택
5. 클러스터 이름 설정
6. "Create" 클릭

### 4단계: 새 클러스터에 접근 설정

1. **Network Access 설정**
   - "Network Access" 메뉴로 이동
   - "Add IP Address" 클릭
   - "Allow Access from Anywhere" (0.0.0.0/0) 선택 또는 현재 IP 추가

2. **Database User 생성**
   - "Database Access" 메뉴로 이동
   - "Add New Database User" 클릭
   - Username과 Password 설정 (기존과 동일하게 설정 가능)
   - "Database User Privileges"는 "Read and write to any database" 선택
   - "Add User" 클릭

3. **Connection String 확인**
   - "Database" 메뉴로 이동
   - "Connect" 버튼 클릭
   - "Connect your application" 선택
   - Connection String 복사
   - 형식: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority`

### 5단계: 새 클러스터에 데이터 복원

1. **.env 파일에 새 연결 정보 추가**
   ```env
   # 기존 (백업용으로 유지)
   MONGODB_URI=mongodb+srv://knuh:mc152615@cluster0.czi1fpr.mongodb.net/test?retryWrites=true&w=majority
   
   # 새 무료 클러스터
   NEW_MONGODB_URI=mongodb+srv://<새username>:<새password>@<새cluster>.mongodb.net/test?retryWrites=true&w=majority
   ```

2. **복원 실행**
   ```bash
   cd backend
   node restore-db.js backups/backup_test_YYYY-MM-DD_HH-MM-SS/test
   ```
   
   백업 경로는 실제 백업된 폴더 경로로 변경하세요.

3. **확인 메시지에 Enter 입력**
   - 복원은 기존 데이터를 덮어쓰므로 확인이 필요합니다.

### 6단계: 연결 정보 업데이트

복원이 완료되면 `.env` 파일의 `MONGODB_URI`를 새 클러스터 URI로 업데이트:

```env
MONGODB_URI=mongodb+srv://<새username>:<새password>@<새cluster>.mongodb.net/test?retryWrites=true&w=majority
```

### 7단계: 연결 테스트

```bash
cd backend
node server.js
```

서버가 정상적으로 시작되고 "Successfully connected to MongoDB" 메시지가 나타나면 성공입니다.

### 8단계: 애플리케이션 테스트

프론트엔드 애플리케이션을 실행하여 모든 기능이 정상 작동하는지 확인:

```bash
npm run dev
```

## 문제 해결

### mongodump/mongorestore 명령어를 찾을 수 없음

MongoDB Database Tools가 설치되어 있는지 확인:
```bash
which mongodump
which mongorestore
```

설치되어 있지 않다면:
```bash
brew install mongodb-database-tools
```

### 백업/복원 중 연결 오류

1. Network Access 설정 확인 (0.0.0.0/0 허용)
2. Database User 권한 확인
3. Connection String 형식 확인
4. 방화벽 설정 확인

### 복원 후 데이터가 보이지 않음

1. 데이터베이스 이름이 올바른지 확인 (`test`)
2. 복원 경로가 올바른지 확인
3. MongoDB Atlas에서 Collections 탭에서 데이터 확인

## 주의사항

⚠️ **중요:**
- 백업 파일은 안전한 곳에 보관하세요
- 복원 전에 새 클러스터에 중요한 데이터가 있다면 별도로 백업하세요
- 복원은 기존 데이터를 덮어씁니다 (`--drop` 옵션 사용)
- 무료 티어는 저장 공간이 제한적입니다 (512MB)

## 백업 파일 관리

백업 파일은 `backend/backups/` 디렉토리에 저장됩니다. 정기적으로 백업을 수행하고 오래된 백업은 삭제하여 공간을 확보하세요.

