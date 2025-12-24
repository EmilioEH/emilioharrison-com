import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

// 1. Build Website
console.log('Building Website...');
run('npm run build -w @emilio/website');

// 2. Build Recipes
console.log('Building Recipes...');
run('npm run build -w @emilio/recipes');

// 3. Merge Outputs
console.log('Merging outputs...');
const distDir = path.resolve('dist');

// Clean dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// --- Static Assets ---

// Copy Website Statics (excluding worker)
console.log('Copying Website statics...');
fs.cpSync('apps/website/dist', 'dist', {
  recursive: true,
  filter: (source) => path.basename(source) !== '_worker.js',
});

// Copy Recipes Statics (excluding worker)
console.log('Copying Recipes statics...');
// We merge directly into dist because Astro already created the /protected/recipes structure in the output
fs.cpSync('apps/recipes/dist', 'dist', {
  recursive: true,
  filter: (source) => path.basename(source) !== '_worker.js',
});

// --- Gateway Worker ---

const gatewayDir = path.join(distDir, '_worker.js');
fs.mkdirSync(gatewayDir, { recursive: true });

// Copy Workers to subdirectories
run(`cp -r apps/website/dist/_worker.js "${gatewayDir}/website"`);
run(`cp -r apps/recipes/dist/_worker.js "${gatewayDir}/recipes"`);

// Create Router Script
const routerCode = `
import website from './website/index.js';
import recipes from './recipes/index.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/protected/recipes')) {
      return recipes.fetch(request, env, ctx);
    }
    return website.fetch(request, env, ctx);
  }
};
`;

fs.writeFileSync(path.join(gatewayDir, 'index.js'), routerCode);

console.log('Unified build complete in dist/ (with Gateway Worker)');
