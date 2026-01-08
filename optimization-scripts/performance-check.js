#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Performance thresholds
const THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 90,
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'first-input-delay': 100,
  'cumulative-layout-shift': 0.1,
  'speed-index': 3000,
  'interactive': 3500
};

// File paths
const LIGHTHOUSE_REPORT = './reports/lighthouse-ci.json';
const PERFORMANCE_LOG = './reports/performance-history.json';

async function checkPerformance() {
  console.log('🔍 Analyzing performance metrics...\n');

  try {
    // Read Lighthouse report
    if (!fs.existsSync(LIGHTHOUSE_REPORT)) {
      console.error('❌ Lighthouse report not found. Run `npm run lighthouse:ci` first.');
      process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(LIGHTHOUSE_REPORT, 'utf8'));
    const { lhr } = report;

    // Extract scores and metrics
    const scores = {
      performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      'best-practices': Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100)
    };

    const metrics = {
      'first-contentful-paint': lhr.audits['first-contentful-paint'].numericValue,
      'largest-contentful-paint': lhr.audits['largest-contentful-paint'].numericValue,
      'first-input-delay': lhr.audits['max-potential-fid'].numericValue,
      'cumulative-layout-shift': lhr.audits['cumulative-layout-shift'].numericValue,
      'speed-index': lhr.audits['speed-index'].numericValue,
      'interactive': lhr.audits['interactive'].numericValue
    };

    // Check thresholds
    let passed = true;
    const results = [];

    console.log('📊 Performance Scores:');
    console.log('─'.repeat(50));

    Object.entries(scores).forEach(([category, score]) => {
      const threshold = THRESHOLDS[category];
      const status = score >= threshold ? '✅' : '❌';
      const color = score >= threshold ? '\x1b[32m' : '\x1b[31m';
      
      console.log(`${status} ${category.padEnd(20)} ${color}${score}\x1b[0m / ${threshold}`);
      
      if (score < threshold) {
        passed = false;
        results.push({
          type: 'score',
          category,
          value: score,
          threshold,
          status: 'failed'
        });
      } else {
        results.push({
          type: 'score',
          category,
          value: score,
          threshold,
          status: 'passed'
        });
      }
    });

    console.log('\n⏱️  Core Web Vitals:');
    console.log('─'.repeat(50));

    Object.entries(metrics).forEach(([metric, value]) => {
      const threshold = THRESHOLDS[metric];
      if (!threshold) return;

      const status = value <= threshold ? '✅' : '❌';
      const color = value <= threshold ? '\x1b[32m' : '\x1b[31m';
      const unit = metric.includes('shift') ? '' : 'ms';
      
      console.log(`${status} ${metric.padEnd(25)} ${color}${Math.round(value)}${unit}\x1b[0m / ${threshold}${unit}`);
      
      if (value > threshold) {
        passed = false;
        results.push({
          type: 'metric',
          category: metric,
          value: Math.round(value),
          threshold,
          status: 'failed'
        });
      } else {
        results.push({
          type: 'metric',
          category: metric,
          value: Math.round(value),
          threshold,
          status: 'passed'
        });
      }
    });

    // Save performance history
    savePerformanceHistory(scores, metrics);

    // Bundle size check
    await checkBundleSize();

    console.log('\n' + '═'.repeat(50));
    
    if (passed) {
      console.log('🎉 All performance checks passed!');
      generatePerformanceReport(results, scores, metrics);
      process.exit(0);
    } else {
      console.log('❌ Performance checks failed!');
      console.log('\n💡 Suggestions:');
      console.log('   • Optimize images and use modern formats (WebP, AVIF)');
      console.log('   • Enable code splitting and lazy loading');
      console.log('   • Reduce bundle size and remove unused dependencies');
      console.log('   • Optimize CSS and remove unused styles');
      console.log('   • Use service worker for caching');
      
      generatePerformanceReport(results, scores, metrics);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error analyzing performance:', error.message);
    process.exit(1);
  }
}

async function checkBundleSize() {
  const buildDir = './dist';
  const maxBundleSize = 250 * 1024; // 250KB
  
  if (!fs.existsSync(buildDir)) {
    console.warn('⚠️  Build directory not found, skipping bundle size check');
    return;
  }

  console.log('\n📦 Bundle Size Analysis:');
  console.log('─'.repeat(50));

  try {
    const files = fs.readdirSync(buildDir, { recursive: true })
      .filter(file => file.endsWith('.js') || file.endsWith('.css'))
      .map(file => {
        const filePath = path.join(buildDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size
        };
      })
      .sort((a, b) => b.size - a.size);

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    files.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      const status = file.size <= maxBundleSize ? '✅' : '❌';
      console.log(`${status} ${file.name.padEnd(30)} ${sizeKB}KB`);
    });

    const totalKB = (totalSize / 1024).toFixed(1);
    const maxTotalKB = (maxBundleSize * 3 / 1024).toFixed(1); // Allow 3x for total
    const totalStatus = totalSize <= maxBundleSize * 3 ? '✅' : '❌';
    
    console.log('─'.repeat(50));
    console.log(`${totalStatus} Total Bundle Size: ${totalKB}KB / ${maxTotalKB}KB`);

  } catch (error) {
    console.warn('⚠️  Could not analyze bundle size:', error.message);
  }
}

function savePerformanceHistory(scores, metrics) {
  const historyData = {
    timestamp: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'local',
    branch: process.env.GITHUB_REF_NAME || 'local',
    scores,
    metrics
  };

  try {
    const historyPath = PERFORMANCE_LOG;
    let history = [];
    
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
    
    history.push(historyData);
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(historyPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    console.log('\n📈 Performance history updated');
    
  } catch (error) {
    console.warn('⚠️  Could not save performance history:', error.message);
  }
}

function generatePerformanceReport(results, scores, metrics) {
  const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .metric { display: flex; justify-content: space-between; padding: 10px; margin: 5px 0; border-radius: 5px; }
        .passed { background-color: #d4edda; color: #155724; }
        .failed { background-color: #f8d7da; color: #721c24; }
        .chart-container { width: 100%; height: 400px; margin: 20px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    </style>
</head>
<body>
    <h1>🚀 Performance Report</h1>
    <p>Generated on: ${new Date().toLocaleString()}</p>
    
    <h2>📊 Performance Scores</h2>
    <div class="grid">
        <div>
            <canvas id="scoresChart"></canvas>
        </div>
        <div>
            <canvas id="metricsChart"></canvas>
        </div>
    </div>
    
    <h2>📋 Detailed Results</h2>
    ${results.map(result => `
        <div class="metric ${result.status}">
            <span>${result.category}</span>
            <span>${result.value} / ${result.threshold}</span>
        </div>
    `).join('')}
    
    <script>
        // Scores Chart
        new Chart(document.getElementById('scoresChart'), {
            type: 'radar',
            data: {
                labels: ${JSON.stringify(Object.keys(scores))},
                datasets: [{
                    label: 'Performance Scores',
                    data: ${JSON.stringify(Object.values(scores))},
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { display: false },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
        
        // Metrics Chart
        new Chart(document.getElementById('metricsChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(metrics).map(k => k.replace(/-/g, ' ')))},
                datasets: [{
                    label: 'Time (ms)',
                    data: ${JSON.stringify(Object.values(metrics))},
                    backgroundColor: ${JSON.stringify(Object.values(metrics).map(v => v <= 2500 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'))},
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    </script>
</body>
</html>`;

  const reportPath = './reports/performance-report.html';
  const reportsDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, reportHTML);
  console.log(`📄 Performance report generated: ${reportPath}`);
}

// Run the performance check
if (require.main === module) {
  checkPerformance();
}

module.exports = { checkPerformance };