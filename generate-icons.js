const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgBuffer = fs.readFileSync('icon.svg');

  // 创建 assets 目录
  if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
  }

  // 生成 PNG (用于 Linux)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('assets/icon.png');

  console.log('✅ PNG icon generated: assets/icon.png');

  // 生成 ICNS (用于 Mac)
  // 需要多个尺寸
  const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
  const icnsDir = 'assets/icon.iconset';

  if (!fs.existsSync(icnsDir)) {
    fs.mkdirSync(icnsDir);
  }

  for (const size of icnsSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(icnsDir, `icon_${size}x${size}.png`));

    if (size <= 512) {
      await sharp(svgBuffer)
        .resize(size * 2, size * 2)
        .png()
        .toFile(path.join(icnsDir, `icon_${size}x${size}@2x.png`));
    }
  }

  console.log('✅ ICNS sources generated: assets/icon.iconset/');

  // 生成 ICO (用于 Windows)
  // ICO 需要多个尺寸
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoImages = [];

  for (const size of icoSizes) {
    const buffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    icoImages.push(buffer);
  }

  // 简化版：只生成最常用的尺寸
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile('assets/icon-256.png');

  console.log('✅ Icon base generated: assets/icon-256.png');
  console.log('\n📝 Next steps:');
  console.log('1. For Mac: Run `iconutil -c icns assets/icon.iconset` to generate icon.icns');
  console.log('2. For Windows: Use an online converter to create icon.ico from icon-256.png');
  console.log('   Recommended: https://convertio.co/png-ico/');
}

generateIcons().catch(console.error);
