const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 명령줄 인자 확인
const backupPath = process.argv[2];
const newMongoUri = process.env.NEW_MONGODB_URI || process.env.MONGODB_URI;

if (!backupPath) {
  console.error('❌ 사용법: node restore-db-node.js <백업경로>');
  console.error('   예시: node restore-db-node.js backups/backup_test_2024-01-15_12-30-00/test');
  console.error('\n💡 백업 목록을 보려면: ls backups/');
  process.exit(1);
}

if (!newMongoUri) {
  console.error('❌ NEW_MONGODB_URI 또는 MONGODB_URI가 .env 파일에 설정되어 있지 않습니다.');
  console.error('   새 MongoDB 클러스터의 연결 URI를 NEW_MONGODB_URI로 설정하거나');
  console.error('   MONGODB_URI를 새 클러스터 URI로 업데이트하세요.');
  process.exit(1);
}

// 백업 경로 확인
const fullBackupPath = path.isAbsolute(backupPath) ? backupPath : path.join(__dirname, backupPath);
if (!fs.existsSync(fullBackupPath)) {
  console.error(`❌ 백업 경로를 찾을 수 없습니다: ${fullBackupPath}`);
  process.exit(1);
}

// 백업 정보 확인
const backupInfoPath = path.join(fullBackupPath, '..', 'backup-info.json');
let backupInfo = null;
if (fs.existsSync(backupInfoPath)) {
  backupInfo = JSON.parse(fs.readFileSync(backupInfoPath, 'utf8'));
  console.log('📋 백업 정보:');
  console.log(`   데이터베이스: ${backupInfo.database}`);
  console.log(`   백업 시간: ${backupInfo.timestamp}`);
  console.log(`   컬렉션 수: ${backupInfo.collections?.length || '알 수 없음'}`);
}

// URI에서 데이터베이스 이름 추출 또는 기본값 사용
let newDbName = 'test';
let fullMongoUri = newMongoUri;

const dbMatch = newMongoUri.match(/\/\/([^:]+):([^@]+)@([^/]+)(?:\/([^?]+))?(?:\?.*)?$/);
if (!dbMatch) {
  console.error('❌ 새 MongoDB URI 형식이 올바르지 않습니다.');
  process.exit(1);
}

const [, , , host, dbNameFromUri] = dbMatch;

// 데이터베이스 이름이 URI에 없으면 기본값 사용
if (dbNameFromUri) {
  newDbName = dbNameFromUri;
} else {
  // URI에 데이터베이스 이름이 없으면 추가
  const hasQueryParams = newMongoUri.includes('?');
  if (hasQueryParams) {
    fullMongoUri = newMongoUri.replace(/\?/, `/test?`);
  } else {
    fullMongoUri = newMongoUri.endsWith('/') 
      ? newMongoUri + 'test?retryWrites=true&w=majority'
      : newMongoUri + '/test?retryWrites=true&w=majority';
  }
  console.log(`💡 URI에 데이터베이스 이름이 없어 'test'를 추가했습니다.`);
}

console.log('\n🔄 MongoDB 복원을 시작합니다 (Node.js 방식)...');
console.log(`📂 백업 경로: ${fullBackupPath}`);
console.log(`📂 새 데이터베이스: ${newDbName}`);
console.log(`📂 새 호스트: ${host}`);

// 확인 메시지
console.log('\n⚠️  경고: 이 작업은 새 데이터베이스의 기존 데이터를 덮어씁니다!');
console.log('   5초 후 자동으로 복원을 시작합니다... (Ctrl+C로 취소)');

// 5초 대기 후 복원 시작
setTimeout(() => {
  // MongoDB 연결
  mongoose.connect(fullMongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('✅ 새 MongoDB에 연결되었습니다.');
    console.log('\n⏳ 복원 중... (시간이 걸릴 수 있습니다)');

    try {
      const db = mongoose.connection.db;
      
      // 백업 디렉토리에서 모든 JSON 파일 찾기
      const files = fs.readdirSync(fullBackupPath).filter(f => f.endsWith('.json'));
      
      if (files.length === 0) {
        console.error('❌ 백업 디렉토리에 JSON 파일이 없습니다.');
        mongoose.connection.close();
        process.exit(1);
      }

      console.log(`📋 발견된 컬렉션 파일: ${files.length}개`);

      // 각 JSON 파일 복원
      for (const file of files) {
        const collectionName = file.replace('.json', '');
        const filePath = path.join(fullBackupPath, file);
        
        console.log(`\n📦 복원 중: ${collectionName}...`);
        
        try {
          // JSON 파일 읽기
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (data.length === 0) {
            console.log(`   ⚠️  ${collectionName}는 비어있습니다.`);
            continue;
          }

          // 기존 컬렉션 삭제 (--drop 옵션과 동일)
          await db.collection(collectionName).deleteMany({});
          
          // 데이터 삽입
          await db.collection(collectionName).insertMany(data);
          
          console.log(`   ✅ ${data.length}개 문서 복원 완료`);
        } catch (err) {
          console.error(`   ❌ ${collectionName} 복원 실패:`, err.message);
        }
      }

      console.log('\n✅ 복원이 완료되었습니다!');
      console.log(`📁 데이터베이스: ${newDbName}`);
      console.log('\n💡 .env 파일의 MONGODB_URI를 새 클러스터 URI로 업데이트하세요.');

      mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ 복원 중 오류가 발생했습니다:', error);
      mongoose.connection.close();
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('❌ 새 MongoDB 연결 실패:', err.message);
    process.exit(1);
  });
}, 5000);

