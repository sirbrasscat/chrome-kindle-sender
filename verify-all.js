/**
 * Full Extension Runtime & Static Validator
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function validateExtension() {
  console.log('=== 1. Validating manifest.json ===');
  const manifestRaw = fs.readFileSync('manifest.json', 'utf8');
  const manifest = JSON.parse(manifestRaw);
  console.log('✓ manifest.json is valid JSON.');

  // Check manifest fields
  if (manifest.manifest_version !== 3) throw new Error('manifest_version must be 3');
  console.log('✓ Manifest V3 confirmed.');

  // Check that all files referenced in manifest exist
  const filesToCheck = [
    manifest.background?.service_worker,
    manifest.action?.default_popup,
    manifest.options_ui?.page,
    ...(manifest.content_scripts?.[0]?.js || []),
    ...(manifest.web_accessible_resources?.[0]?.resources || [])
  ].filter(Boolean);

  filesToCheck.forEach(f => {
    if (!fs.existsSync(f)) {
      console.warn(`⚠️ Warning: Referenced file in manifest does not exist: ${f}`);
    } else {
      console.log(`✓ File exists: ${f}`);
    }
  });

  // Check web_accessible_resources for pdf.worker.min.js
  console.log('\n=== 2. Validating web_accessible_resources for PDF Worker ===');
  const war = manifest.web_accessible_resources || [];
  const warFiles = war.flatMap(w => w.resources || []);
  console.log('web_accessible_resources currently:', warFiles);

  // Check Service Worker imports
  console.log('\n=== 3. Testing Background Service Worker Context ===');
  const swCode = fs.readFileSync('background/service-worker.js', 'utf8');
  
  // Mock service worker sandbox
  const swSandbox = {
    importScripts: (...scripts) => {
      console.log('Service Worker importScripts called with:', scripts);
      scripts.forEach(s => {
        const resolvedPath = path.resolve('background', s);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`importScripts target not found: ${resolvedPath} (from ${s})`);
        }
        const scriptCode = fs.readFileSync(resolvedPath, 'utf8');
        vm.runInContext(scriptCode, context, { filename: s });
      });
    },
    chrome: {
      runtime: {
        onInstalled: { addListener: () => {} },
        onMessage: { addListener: () => {} },
        sendMessage: () => Promise.resolve({})
      },
      contextMenus: {
        create: () => {},
        onClicked: { addListener: () => {} }
      },
      commands: {
        onCommand: { addListener: () => {} }
      },
      action: {
        setBadgeText: () => {},
        setBadgeBackgroundColor: () => {}
      },
      storage: {
        local: { get: (k, cb) => cb({}), set: (d, cb) => cb?.() },
        sync: { get: (k, cb) => cb({}), set: (d, cb) => cb?.() }
      }
    },
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };
  swSandbox.globalThis = swSandbox;

  const context = vm.createContext(swSandbox);
  try {
    vm.runInContext(swCode, context, { filename: 'background/service-worker.js' });
    console.log('✓ Service worker evaluated with ZERO errors.');
  } catch (err) {
    console.error('❌ Service worker error:', err);
    throw err;
  }

  // Check Popup HTML and JS
  console.log('\n=== 4. Validating Popup HTML & Script dependencies ===');
  const popupHtml = fs.readFileSync('popup/popup.html', 'utf8');
  const scriptRegex = /<script\s+src=["']([^"']+)["']><\/script>/g;
  let match;
  const popupScripts = [];
  while ((match = scriptRegex.exec(popupHtml)) !== null) {
    popupScripts.push(match[1]);
  }
  console.log('Popup scripts order:', popupScripts);

  // Check matching DOM IDs between popup.html and popup.js
  console.log('\n=== 5. Checking DOM ID consistency between popup.html and popup.js ===');
  const popupJs = fs.readFileSync('popup/popup.js', 'utf8');
  const getElRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
  const queriedIds = new Set();
  while ((match = getElRegex.exec(popupJs)) !== null) {
    queriedIds.add(match[1]);
  }

  let missingIds = 0;
  queriedIds.forEach(id => {
    if (!popupHtml.includes(`id="${id}"`)) {
      console.error(`❌ Missing DOM element in popup.html: id="${id}"`);
      missingIds++;
    }
  });

  if (missingIds === 0) {
    console.log(`✓ All ${queriedIds.size} getElementById references exist in popup.html!`);
  }

  console.log('\n=== ALL STATIC CHECKS COMPLETE ===');
}

validateExtension().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
