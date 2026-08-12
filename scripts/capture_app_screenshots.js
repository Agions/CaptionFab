import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = path.resolve('public/screenshots');
const docsOutDir = path.resolve('docs/public/screenshots');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(docsOutDir)) fs.mkdirSync(docsOutDir, { recursive: true });

async function main() {
  // Launch Chrome with CDP enabled
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,900',
    'http://localhost:1420/'
  ]);

  // Wait 3s for Chrome to initialize
  await new Promise(r => setTimeout(r, 3000));

  try {
    const res = await fetch('http://localhost:9222/json');
    const pages = await res.json();
    const targetPage = pages.find(p => p.url.includes('localhost:1420'));

    if (!targetPage || !targetPage.webSocketDebuggerUrl) {
      throw new Error('Chrome CDP page not found');
    }

    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function sendCDP(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // 1. Capture Main Studio UI (Real Chinese UI)
    console.log('Capturing Main Studio UI...');
    await new Promise(r => setTimeout(r, 1000));
    const ss1 = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'app-studio-ui.jpg'), Buffer.from(ss1.data, 'base64'));
    fs.writeFileSync(path.join(docsOutDir, 'app-studio-ui.jpg'), Buffer.from(ss1.data, 'base64'));

    fs.writeFileSync(path.join(outDir, 'roi-selection.png'), Buffer.from(ss1.data, 'base64'));
    fs.writeFileSync(path.join(docsOutDir, 'roi-selection.png'), Buffer.from(ss1.data, 'base64'));

    // 2. Open Settings Modal by evaluating click on Settings button
    console.log('Opening Settings Modal...');
    await sendCDP('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('header button[title*="配置"]');
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // 3. Capture Settings Modal UI (Real Chinese UI)
    const ss2 = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'settings-modal.jpg'), Buffer.from(ss2.data, 'base64'));
    fs.writeFileSync(path.join(docsOutDir, 'settings-modal.jpg'), Buffer.from(ss2.data, 'base64'));

    console.log('Successfully captured all real running Chinese UI screenshots!');
    ws.close();
  } catch (err) {
    console.error('CDP capture error:', err);
  } finally {
    chromeProcess.kill();
  }
}

main().catch(console.error);
