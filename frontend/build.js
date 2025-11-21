/**
 * Simple build script to copy static files
 * Alternative to webpack for faster builds
 */
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'public');
const destDir = path.join(__dirname, 'dist');

// Remove dist directory if it exists
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync(destDir, { recursive: true });

// Copy function
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy all files
try {
  copyRecursiveSync(sourceDir, destDir);
  console.log('✅ Build complete! Files copied to dist/');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}

