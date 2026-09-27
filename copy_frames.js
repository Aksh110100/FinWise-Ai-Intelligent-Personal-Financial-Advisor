const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'scroll animation', 'public', 'financial-frames-v2');
const destDir = path.join(__dirname, 'frontend', 'public', 'financial-frames');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.readdirSync(srcDir).forEach(file => {
  const srcFile = path.join(srcDir, file);
  const destFile = path.join(destDir, file);
  if (fs.statSync(srcFile).isFile()) {
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${file}`);
  }
});

console.log('Finished copying frames!');
