const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 백업 디렉토리
const backupDir = path.join(__dirname, 'backups');

// 명령줄 인자 확인
const backupPath = process.argv[2];
const newMongoUri = process.env.NEW_MONGODB_URI || process.env.MONGODB_URI;

if (!backupPath) {
  console.error('❌ 사용법: node restore-db.js <백업경로>');
  console.error('   예시: node restore-db.js backups/backup_test_2024-01-15_12-30-00/test');
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
let newDbName = 'test'; // 기본 데이터베이스 이름
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

console.log('\n🔄 MongoDB 복원을 시작합니다...');
console.log(`📂 백업 경로: ${fullBackupPath}`);
console.log(`📂 새 데이터베이스: ${newDbName}`);
console.log(`📂 새 호스트: ${host}`);

// 확인 메시지
console.log('\n⚠️  경고: 이 작업은 새 데이터베이스의 기존 데이터를 덮어씁니다!');
console.log('   5초 후 자동으로 복원을 시작합니다... (Ctrl+C로 취소)');

// 5초 대기 후 복원 시작
setTimeout(() => {
  // mongorestore 명령어 생성
  const restoreCommand = `mongorestore --uri="${fullMongoUri}" --drop "${fullBackupPath}"`;

  console.log('\n⏳ 복원 중... (시간이 걸릴 수 있습니다)');

  exec(restoreCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ 복원 중 오류가 발생했습니다:');
      console.error(error.message);
      
      // mongorestore가 설치되어 있지 않은 경우 안내
      if (error.message.includes('mongorestore') || error.code === 127) {
        console.error('\n💡 mongorestore가 설치되어 있지 않습니다.');
        console.error('   다음 명령어로 MongoDB Database Tools를 설치하세요:');
        console.error('   macOS: brew install mongodb-database-tools');
        console.error('   또는 https://www.mongodb.com/try/download/database-tools 에서 다운로드');
      }
      process.exit(1);
    }

    if (stderr) {
      console.log('⚠️  경고:', stderr);
    }

    if (stdout) {
      console.log(stdout);
    }

    console.log('\n✅ 복원이 완료되었습니다!');
    console.log(`📁 데이터베이스: ${newDbName}`);
    console.log('\n💡 .env 파일의 MONGODB_URI를 새 클러스터 URI로 업데이트하세요.');
  });
}, 5000);

