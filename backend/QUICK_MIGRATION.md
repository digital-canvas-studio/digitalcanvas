# 빠른 마이그레이션 가이드

## 제공된 새 MongoDB URI

```
mongodb+srv://knuh:Mc152615@cluster0.czi1fpr.mongodb.net/
```

## 단계별 진행

### 1단계: 백업 (아직 안 했다면)

```bash
cd backend
npm run backup-db
```

### 2단계: .env 파일에 새 URI 추가

`.env` 파일을 열고 다음을 추가하세요:

```env
# 새 무료 클러스터 (복원용)
NEW_MONGODB_URI=mongodb+srv://knuh:Mc152615@cluster0.czi1fpr.mongodb.net/test?retryWrites=true&w=majority
```

또는 직접 명령줄에서:

```bash
cd backend
echo 'NEW_MONGODB_URI=mongodb+srv://knuh:Mc152615@cluster0.czi1fpr.mongodb.net/test?retryWrites=true&w=majority' >> .env
```

### 3단계: 백업 파일 확인

```bash
cd backend
ls -la backups/
```

가장 최근 백업 폴더를 찾으세요. 예: `backup_test_2024-01-15_12-30-00`

### 4단계: 데이터 복원

```bash
cd backend
npm run restore-db backups/backup_test_YYYY-MM-DD_HH-MM-SS/test
```

실제 백업 폴더 이름으로 변경하세요.

### 5단계: .env 파일 업데이트

복원이 완료되면 `.env` 파일의 `MONGODB_URI`를 새 URI로 업데이트:

```env
MONGODB_URI=mongodb+srv://knuh:Mc152615@cluster0.czi1fpr.mongodb.net/test?retryWrites=true&w=majority
```

### 6단계: 서버 테스트

```bash
cd backend
node server.js
```

"Successfully connected to MongoDB" 메시지가 보이면 성공입니다!

## 완전한 새 MongoDB URI

```
mongodb+srv://knuh:Mc152615@cluster0.czi1fpr.mongodb.net/test?retryWrites=true&w=majority
```

## 주의사항

- 비밀번호가 `Mc152615`로 변경되었습니다 (대문자 M)
- 데이터베이스 이름은 `test`로 동일합니다
- 복원 전에 백업이 완료되었는지 확인하세요

