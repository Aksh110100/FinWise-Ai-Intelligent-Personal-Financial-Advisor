const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./frontend/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.css') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let replaced = content.replace(/--font-family-heading/g, '--font-primary')
                          .replace(/--font-family-body/g, '--font-secondary');
    if (content !== replaced) {
      fs.writeFileSync(filePath, replaced);
      console.log('Updated', filePath);
    }
  }
});
