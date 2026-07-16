#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  inputDir: './src/assets/images',
  outputDir: './public/images',
  formats: ['webp', 'avif'],
  sizes: [320, 640, 960, 1280, 1920],
  quality: {
    webp: 85,
    avif: 75,
    jpeg: 90
  },
  extensions: ['.jpg', '.jpeg', '.png'],
  maxFileSize: 1024 * 1024 // 1MB
};

// Check if required tools are available
function checkDependencies() {
  const tools = ['cwebp', 'avifenc', 'convert']; // ImageMagick convert
  
  console.log('🔍 Checking dependencies...');
  
  for (const tool of tools) {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
      console.log(`✅ ${tool} found`);
    } catch (error) {
      console.log(`❌ ${tool} not found`);
      console.log(`\nInstall instructions:`);
      console.log(`• WebP: brew install webp`);
      console.log(`• AVIF: brew install libavif`);
      console.log(`• ImageMagick: brew install imagemagick`);
      process.exit(1);
    }
  }
}

// Get all image files recursively
function getImageFiles(dir) {
  const files = [];
  
  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (CONFIG.extensions.includes(path.extname(item).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

// Generate responsive image sizes
function generateResponsiveSizes(inputFile, outputDir, baseName) {
  const results = [];
  
  for (const size of CONFIG.sizes) {
    const outputFile = path.join(outputDir, `${baseName}-${size}w.jpg`);
    
    try {
      // Resize with ImageMagick
      execSync(`convert "${inputFile}" -resize ${size}x -quality ${CONFIG.quality.jpeg} "${outputFile}"`, 
        { stdio: 'ignore' });
      
      const stats = fs.statSync(outputFile);
      results.push({
        size,
        file: outputFile,
        fileSize: stats.size
      });
      
      console.log(`  📏 ${size}w: ${(stats.size / 1024).toFixed(1)}KB`);
      
    } catch (error) {
      console.warn(`⚠️  Failed to generate ${size}w version: ${error.message}`);
    }
  }
  
  return results;
}

// Convert to WebP format
function convertToWebP(inputFile, outputFile) {
  try {
    execSync(`cwebp -q ${CONFIG.quality.webp} "${inputFile}" -o "${outputFile}"`, 
      { stdio: 'ignore' });
    
    const stats = fs.statSync(outputFile);
    console.log(`  🖼️  WebP: ${(stats.size / 1024).toFixed(1)}KB`);
    return true;
  } catch (error) {
    console.warn(`⚠️  WebP conversion failed: ${error.message}`);
    return false;
  }
}

// Convert to AVIF format
function convertToAVIF(inputFile, outputFile) {
  try {
    execSync(`avifenc -q ${CONFIG.quality.avif} "${inputFile}" "${outputFile}"`, 
      { stdio: 'ignore' });
    
    const stats = fs.statSync(outputFile);
    console.log(`  🚀 AVIF: ${(stats.size / 1024).toFixed(1)}KB`);
    return true;
  } catch (error) {
    console.warn(`⚠️  AVIF conversion failed: ${error.message}`);
    return false;
  }
}

// Generate srcSet string for responsive images
function generateSrcSet(baseName, sizes, format = 'jpg') {
  return sizes.map(size => `${baseName}-${size}w.${format} ${size}w`).join(', ');
}

// Process a single image
function processImage(inputFile) {
  const relativePath = path.relative(CONFIG.inputDir, inputFile);
  const parsedPath = path.parse(relativePath);
  const baseName = path.join(parsedPath.dir, parsedPath.name).replace(/\\/g, '/');
  
  // Create output directory
  const outputDir = path.join(CONFIG.outputDir, parsedPath.dir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`\n🖼️  Processing: ${relativePath}`);
  
  const originalStats = fs.statSync(inputFile);
  console.log(`  📊 Original: ${(originalStats.size / 1024).toFixed(1)}KB`);
  
  // Check if file is too large
  if (originalStats.size > CONFIG.maxFileSize) {
    console.log(`  ⚠️  File too large (>${(CONFIG.maxFileSize / 1024 / 1024).toFixed(1)}MB), compressing...`);
  }
  
  const results = {
    original: inputFile,
    baseName,
    formats: {},
    responsive: {},
    totalSavings: 0
  };
  
  // Generate responsive sizes for original format
  const responsiveSizes = generateResponsiveSizes(inputFile, outputDir, baseName);
  results.responsive.jpg = responsiveSizes;
  
  // Convert to modern formats
  for (const format of CONFIG.formats) {
    console.log(`  🔄 Converting to ${format.toUpperCase()}...`);
    
    const responsiveFormatSizes = [];
    
    for (const sizeInfo of responsiveSizes) {
      const outputFile = sizeInfo.file.replace('.jpg', `.${format}`);
      
      let success = false;
      if (format === 'webp') {
        success = convertToWebP(sizeInfo.file, outputFile);
      } else if (format === 'avif') {
        success = convertToAVIF(sizeInfo.file, outputFile);
      }
      
      if (success) {
        const stats = fs.statSync(outputFile);
        responsiveFormatSizes.push({
          size: sizeInfo.size,
          file: outputFile,
          fileSize: stats.size
        });
        
        // Calculate savings
        const savings = sizeInfo.fileSize - stats.size;
        results.totalSavings += savings;
      }
    }
    
    results.responsive[format] = responsiveFormatSizes;
  }
  
  return results;
}

// Generate HTML snippet for optimized images
function generateHTMLSnippet(result) {
  const { baseName, responsive } = result;
  
  const avifSrcSet = responsive.avif?.length > 0 
    ? generateSrcSet(baseName, responsive.avif.map(r => r.size), 'avif')
    : '';
    
  const webpSrcSet = responsive.webp?.length > 0
    ? generateSrcSet(baseName, responsive.webp.map(r => r.size), 'webp')
    : '';
    
  const jpgSrcSet = generateSrcSet(baseName, responsive.jpg.map(r => r.size), 'jpg');
  
  return `
<!-- Optimized image: ${baseName} -->
<picture>
  ${avifSrcSet ? `<source srcSet="${avifSrcSet}" type="image/avif" />` : ''}
  ${webpSrcSet ? `<source srcSet="${webpSrcSet}" type="image/webp" />` : ''}
  <img 
    src="${baseName}-640w.jpg"
    srcSet="${jpgSrcSet}"
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    alt="Description"
    loading="lazy"
    style="width: 100%; height: auto;"
  />
</picture>`;
}

// Main optimization function
async function optimizeImages() {
  console.log('🚀 Starting image optimization...\n');
  
  // Check dependencies
  checkDependencies();
  
  // Check input directory
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error(`❌ Input directory not found: ${CONFIG.inputDir}`);
    process.exit(1);
  }
  
  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Get all image files
  const imageFiles = getImageFiles(CONFIG.inputDir);
  console.log(`📁 Found ${imageFiles.length} images to process\n`);
  
  if (imageFiles.length === 0) {
    console.log('No images found to process.');
    return;
  }
  
  const results = [];
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  
  // Process each image
  for (const imageFile of imageFiles) {
    try {
      const result = processImage(imageFile);
      results.push(result);
      
      const originalSize = fs.statSync(result.original).size;
      totalOriginalSize += originalSize;
      totalOptimizedSize += (originalSize - result.totalSavings);
      
    } catch (error) {
      console.error(`❌ Failed to process ${imageFile}: ${error.message}`);
    }
  }
  
  // Generate summary report
  console.log('\n' + '═'.repeat(60));
  console.log('📊 OPTIMIZATION SUMMARY');
  console.log('═'.repeat(60));
  
  const totalSavings = totalOriginalSize - totalOptimizedSize;
  const savingsPercent = ((totalSavings / totalOriginalSize) * 100).toFixed(1);
  
  console.log(`📁 Images processed: ${results.length}`);
  console.log(`📏 Original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🗜️  Optimized size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`💾 Total savings: ${(totalSavings / 1024 / 1024).toFixed(2)}MB (${savingsPercent}%)`);
  
  // Generate HTML snippets
  console.log('\n📝 Generating HTML snippets...');
  const htmlSnippets = results.map(result => ({
    file: result.baseName,
    html: generateHTMLSnippet(result)
  }));
  
  // Save snippets to file
  const snippetsFile = path.join(CONFIG.outputDir, 'image-snippets.html');
  const snippetsHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Optimized Image Snippets</title>
    <style>
        body { font-family: monospace; margin: 40px; line-height: 1.6; }
        .snippet { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 5px; }
        .filename { font-weight: bold; color: #333; margin-bottom: 10px; }
        pre { overflow-x: auto; background: white; padding: 15px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>📱 Optimized Image HTML Snippets</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>
    <p>Copy and paste these snippets into your React components:</p>
    
    ${htmlSnippets.map(snippet => `
        <div class="snippet">
            <div class="filename">📄 ${snippet.file}</div>
            <pre><code>${snippet.html.trim()}</code></pre>
        </div>
    `).join('')}
</body>
</html>`;
  
  fs.writeFileSync(snippetsFile, snippetsHTML);
  console.log(`📄 HTML snippets saved to: ${snippetsFile}`);
  
  console.log('\n🎉 Image optimization complete!');
  console.log('\n💡 Next steps:');
  console.log('   • Update your React components to use the optimized images');
  console.log('   • Use the generated HTML snippets as reference');
  console.log('   • Consider implementing lazy loading with Intersection Observer');
  console.log('   • Set up automated image optimization in your CI/CD pipeline');
}

// Run the script
if (require.main === module) {
  optimizeImages().catch(console.error);
}

module.exports = { optimizeImages };