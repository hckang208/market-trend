// scripts/fix-generative-ai-alias.js
// Run automatically on "npm install" (preinstall). It:
// - Rewrites any package.json (root and subdirs) to remove "google-generative-ai"
// - Adds "@google/generative-ai": "^0.21.0"
// - Adds alias "google-generative-ai": "npm:@google/generative-ai@^0.21.0" to catch stale imports
// - Deletes lock files that reference the wrong pkg
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function writeJSON(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function walk(dir, cb) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === '.next' || name.name.startsWith('.git')) continue;
      walk(p, cb);
    } else {
      cb(p);
    }
  }
}

function fixPackageJson(p) {
  const pkg = readJSON(p);
  if (!pkg) return false;
  let changed = false;
  pkg.dependencies = pkg.dependencies || {};
  pkg.devDependencies = pkg.devDependencies || {};

  // remove wrong dep if present
  if (pkg.dependencies['google-generative-ai']) {
    delete pkg.dependencies['google-generative-ai']; changed = true;
  }
  if (pkg.devDependencies['google-generative-ai']) {
    delete pkg.devDependencies['google-generative-ai']; changed = true;
  }

  // add correct dep
  if (!pkg.dependencies['@google/generative-ai']) {
    pkg.dependencies['@google/generative-ai'] = '^0.21.0'; changed = true;
  }

  // add alias to catch stale imports or subpackages
  if (!pkg.dependencies['google-generative-ai']) {
    pkg.dependencies['google-generative-ai'] = 'npm:@google/generative-ai@^0.21.0'; changed = true;
  }

  // ensure Node 20
  pkg.engines = pkg.engines || {};
  if (pkg.engines.node !== '20.x') {
    pkg.engines.node = '20.x'; changed = true;
  }

  if (changed) {
    writeJSON(p, pkg);
    console.log('[fix-generative-ai-alias] patched', p);
  }
  return changed;
}

function deleteIfExists(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { force: true });
    console.log('[fix-generative-ai-alias] removed', p);
  }
}

// Run
let touched = 0;
walk(ROOT, (p) => {
  if (path.basename(p) === 'package.json') {
    if (fixPackageJson(p)) touched++;
  }
  const base = path.basename(p);
  if (base === 'package-lock.json' || base === 'pnpm-lock.yaml' || base === 'yarn.lock') {
    // remove old locks; npm will recreate with corrected deps
    deleteIfExists(p);
  }
});

if (touched === 0) {
  console.log('[fix-generative-ai-alias] no package.json changed.');
} else {
  console.log('[fix-generative-ai-alias] package.json files patched:', touched);
}