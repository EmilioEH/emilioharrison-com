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

// Copy Website to dist
run(`cp -r apps/website/dist/* dist/`);

// Copy Recipes to dist/protected/recipes
const recipesDest = path.join(distDir, 'protected', 'recipes');
fs.mkdirSync(recipesDest, { recursive: true });
run(`cp -r apps/recipes/dist/* "${recipesDest}/"`);

console.log('Unified build complete in dist/');
