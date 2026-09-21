const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// Publish current entrypoints only; historical apps remain in git, not on the website.
const assets = [
  'index.html', 'privacy-policy.html', 'terms-of-service.html', 'transaction-law.html',
  'favicon.ico', 'icon-192.png', 'icon-512.png', 'sw.js',
  'js/toast-notification.js', 'js/onboarding.js', 'js/analytics.js',
  'js/multi-image-handler.js', 'js/calendar-view.js',
  'js/ai-emotion-analyzer.js', 'js/reminder-system.js',
  'js/app/config/constants.js', 'js/app/services/memory-repository.js',
  'js/app/services/memory-service.js', 'js/app/services/premium-service.js',
  'js/app/services/image-service.js', 'js/app/services/location-service.js'
];

function buildStatic(output = path.join(root, 'dist')) {
  fs.mkdirSync(output, { recursive: true });
  // Never silently delete files. Refuse an output directory containing unexpected files.
  const existing = fs.readdirSync(output, { recursive: true, withFileTypes: true });
  for (const entry of existing) {
    if (!entry.isDirectory()) {
      const relative = path.relative(output, path.join(entry.parentPath || entry.path, entry.name));
      if (!assets.includes(relative)) throw new Error(`Unexpected file in build output: ${relative}`);
    }
  }
  for (const asset of assets) {
    const destination = path.join(output, asset);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, asset), destination);
  }
  return assets;
}

if (require.main === module) console.log(`Built ${buildStatic().length} public assets in dist/`);
module.exports = { buildStatic };
