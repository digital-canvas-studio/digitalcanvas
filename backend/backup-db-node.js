const mongoose = require('mongoose');
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

const [, , , , dbName] = dbMatch;

// 백업 파일명 (타임스탬프 포함)
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const backupFileName = `backup_${dbName}_${timestamp}`;
const backupPath = path.join(backupDir, backupFileName);
const dbBackupPath = path.join(backupPath, dbName);

if (!fs.existsSync(dbBackupPath)) {
  fs.mkdirSync(dbBackupPath, { recursive: true });
}

console.log('📦 MongoDB 백업을 시작합니다 (Node.js 방식)...');
console.log(`📂 데이터베이스: ${dbName}`);
console.log(`💾 백업 경로: ${dbBackupPath}`);

// MongoDB 연결
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB에 연결되었습니다.');
  console.log('\n⏳ 컬렉션 목록을 가져오는 중...');

  try {
    // 모든 컬렉션 목록 가져오기
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`📋 발견된 컬렉션: ${collections.length}개`);
    
    const backupInfo = {
      timestamp: new Date().toISOString(),
      database: dbName,
      host: dbMatch[3],
      backupPath: dbBackupPath,
      collections: []
    };

    // 각 컬렉션 백업
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n📦 백업 중: ${collectionName}...`);
      
      try {
        const collectionData = await db.collection(collectionName).find({}).toArray();
        
        // JSON 파일로 저장
        const jsonPath = path.join(dbBackupPath, `${collectionName}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(collectionData, null, 2));
        
        backupInfo.collections.push({
          name: collectionName,
          count: collectionData.length,
          file: `${collectionName}.json`
        });
        
        console.log(`   ✅ ${collectionData.length}개 문서 백업 완료`);
      } catch (err) {
        console.error(`   ❌ ${collectionName} 백업 실패:`, err.message);
      }
    }

    // 백업 정보 저장
    fs.writeFileSync(
      path.join(backupPath, 'backup-info.json'),
      JSON.stringify(backupInfo, null, 2)
    );

    console.log('\n✅ 백업이 완료되었습니다!');
    console.log(`📁 백업 위치: ${dbBackupPath}`);
    console.log(`📋 총 ${backupInfo.collections.length}개 컬렉션 백업됨`);
    console.log('\n💡 백업 파일을 압축하려면 다음 명령어를 실행하세요:');
    console.log(`   cd ${backupDir} && tar -czf ${backupFileName}.tar.gz ${backupFileName}`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 백업 중 오류가 발생했습니다:', error);
    mongoose.connection.close();
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ MongoDB 연결 실패:', err.message);
  process.exit(1);
});

