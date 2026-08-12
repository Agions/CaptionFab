import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = path.resolve('public/screenshots');
const docsOutDir = path.resolve('docs/public/screenshots');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(docsOutDir)) fs.mkdirSync(docsOutDir, { recursive: true });

function capture(filename) {
  return new Promise((resolve, reject) => {
    const targetPath = path.join(outDir, filename);
    const proc = spawn(chromePath, [
      '--headless=new',
      '--disable-gpu',
      '--window-size=1440,900',
      `--screenshot=${targetPath}`,
      'http://localhost:1420/'
    ]);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(targetPath)) {
        fs.copyFileSync(targetPath, path.join(docsOutDir, filename));
        console.log(`Successfully captured real running screenshot: ${filename}`);
        resolve();
      } else {
        reject(new Error(`Failed to capture screenshot ${filename}, exit code: ${code}`));
      }
    });
  });
}

async function run() {
  await capture('app-studio-ui.jpg');
  await capture('roi-selection.png');
  await capture('settings-modal.jpg');
  console.log('All real running screenshots captured successfully!');
}

run().catch(console.error);
