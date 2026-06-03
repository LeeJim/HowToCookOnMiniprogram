const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 从 miniprogram/package.json 读取版本号
const pkgPath = path.join(__dirname, '..', 'miniprogram', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

// 将私钥写入临时文件（miniprogram-ci 只能读文件路径，不能直接传内容）
const keyPath = path.join(os.tmpdir(), `mp-private-key-${Date.now()}.key`);
fs.writeFileSync(keyPath, process.env.MINI_APP_PRIVATE_KEY, 'utf8');

// project.config.json 在仓库根目录，其中 miniprogramRoot 指向 miniprogram/
const project = new ci.Project({
  appid: process.env.MINI_APP_ID,
  type: 'miniProgram',
  projectPath: path.join(__dirname, '..'),
  privateKeyPath: keyPath,
});

// 取 commit message 第一行作为版本描述
const desc = (process.env.COMMIT_MESSAGE || 'CI auto upload').split('\n')[0].trim().slice(0, 200);

async function main() {
  console.log(`📦 Version: ${version}`);
  console.log(`📝 Description: ${desc}`);

  // Step 1: 构建 npm 包（miniprogram-ci 不会自动处理 node_modules）
  console.log('📦 Building npm...');
  await ci.packNpmManually({
    packageJsonPath: path.join(__dirname, '..', 'miniprogram', 'package.json'),
    miniprogramNpmDistDir: path.join(__dirname, '..', 'miniprogram'),
  });
  console.log('✅ Npm build done');

  // Step 2: 上传体验版
  console.log('⬆️  Uploading...');
  const uploadResult = await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      es7: true,
      minify: true,
      autoPrefixWXSS: true,
    },
    onProgressUpdate: (info) => {
      if (info.status === 'uploading') {
        console.log(`   Uploading: ${info.progress}%`);
      } else {
        console.log(`   ${info.status}: ${info.message || ''}`);
      }
    },
  });
  console.log('✅ Upload success');

  // Step 3: 提交审核
  console.log('📤 Submitting audit...');
  try {
    const auditResult = await ci.submitAudit({
      project,
      version,
    });
    console.log('✅ Submit audit success:', JSON.stringify(auditResult));
  } catch (err) {
    // 提交审核失败不一定是 bug（比如有审核中的版本），记录后继续
    console.warn('⚠️  Submit audit failed:', err.message);
  }

  // 清理临时私钥文件
  fs.unlinkSync(keyPath);
}

main().catch(err => {
  console.error('❌ CI upload failed:', err.message);
  try { fs.unlinkSync(keyPath); } catch {}
  process.exit(1);
});
