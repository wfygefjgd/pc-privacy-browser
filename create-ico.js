const fs = require('fs');
const { execSync } = require('child_process');

// 使用 ImageMagick (如果可用) 或创建一个简单的 ICO
async function createIco() {
  const sharp = require('sharp');

  // 生成多个尺寸的 PNG
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngFiles = [];

  for (const size of sizes) {
    const filename = `assets/icon-${size}.png`;
    await sharp('icon.svg')
      .resize(size, size)
      .png()
      .toFile(filename);
    pngFiles.push(filename);
    console.log(`✅ Generated ${filename}`);
  }

  console.log('\n✅ All PNG sizes generated!');
  console.log('📝 Windows ICO will be created from the 256px version');

  // 对于 Windows，我们使用最简单的方法：重命名 256px 版本
  // Electron Builder 可以接受 PNG 作为图标
  fs.copyFileSync('assets/icon-256.png', 'assets/icon.ico');
  console.log('✅ icon.ico created (from 256px PNG)');
}

createIco().catch(console.error);
