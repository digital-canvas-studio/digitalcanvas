const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 백업 디렉토리 생성
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// MongoDB URI 파싱
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI가 .env 파일에 설정되어 있지 않습니다.');
  process.exit(1);
}

// URI에서 데이터베이스 이름 추출
const dbMatch = mongoUri.match(/\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
if (!dbMatch) {
  console.error('❌ MongoDB URI 형식이 올바르지 않습니다.');
  process.exit(1);
}

const [, username, password, host, dbName] = dbMatch;
const clusterHost = host.replace(/\.mongodb\.net/, '');

// 백업 파일명 (타임스탬프 포함)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const backupFileName = `backup_${dbName}_${timestamp}`;
const backupPath = path.join(backupDir, backupFileName);

console.log('📦 MongoDB 백업을 시작합니다...');
console.log(`📂 데이터베이스: ${dbName}`);
console.log(`📂 호스트: ${host}`);
console.log(`💾 백업 경로: ${backupPath}`);

// mongodump 명령어 생성
// MongoDB Atlas의 경우 URI를 직접 사용
const dumpCommand = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

console.log('\n⏳ 백업 중... (시간이 걸릴 수 있습니다)');

exec(dumpCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ 백업 중 오류가 발생했습니다:');
    console.error(error.message);
    
    // mongodump가 설치되어 있지 않은 경우 안내
    if (error.message.includes('mongodump') || error.code === 127) {
      console.error('\n💡 mongodump가 설치되어 있지 않습니다.');
      console.error('   다음 명령어로 MongoDB Database Tools를 설치하세요:');
      console.error('   macOS: brew install mongodb-database-tools');
      console.error('   또는 https://www.mongodb.com/try/download/database-tools 에서 다운로드');
    }
    process.exit(1);
  }

  if (stderr) {
    console.log('⚠️  경고:', stderr);
  }

  // 백업 완료 확인
  const dbBackupPath = path.join(backupPath, dbName);
  if (fs.existsSync(dbBackupPath)) {
    console.log('\n✅ 백업이 완료되었습니다!');
    console.log(`📁 백업 위치: ${dbBackupPath}`);
    
    // 압축 옵션 (선택사항)
    console.log('\n💡 백업 파일을 압축하려면 다음 명령어를 실행하세요:');
    console.log(`   cd ${backupDir} && tar -czf ${backupFileName}.tar.gz ${backupFileName}`);
    
    // 백업 정보 저장
    const backupInfo = {
      timestamp: new Date().toISOString(),
      database: dbName,
      host: host,
      backupPath: dbBackupPath,
      collections: fs.readdirSync(dbBackupPath).filter(f => f.endsWith('.bson'))
    };
    
    fs.writeFileSync(
      path.join(backupPath, 'backup-info.json'),
      JSON.stringify(backupInfo, null, 2)
    );
    
    console.log('\n📋 백업 정보가 backup-info.json에 저장되었습니다.');
  } else {
    console.error('❌ 백업 파일을 찾을 수 없습니다.');
    process.exit(1);
  }
});

