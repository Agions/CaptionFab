import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = path.resolve('public/screenshots');
const docsOutDir = path.resolve('docs/public/screenshots');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(docsOutDir)) fs.mkdirSync(docsOutDir, { recursive: true });

async function waitForServer(url, retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      let res = await fetch(url).catch(() => null);
      if (res && res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('Waiting for dev server http://localhost:1420/...');
  const ready = await waitForServer('http://localhost:1420/');
  if (!ready) {
    console.error('Dev server http://localhost:1420/ is not ready.');
    process.exit(1);
  }

  // Launch Chrome CDP with explicit window size and device scale factor
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-host=127.0.0.1',
    '--remote-debugging-port=9222',
    '--window-size=1440,900',
    '--force-device-scale-factor=1'
  ]);

  const cdpReady = await waitForServer('http://127.0.0.1:9222/json', 30);
  if (!cdpReady) {
    chromeProcess.kill();
    throw new Error('Chrome CDP port 9222 failed to start');
  }

  try {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const targetPage = pages.find(p => p.url.includes('1420')) || pages.find(p => p.type === 'page');

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

    await sendCDP('Page.enable');
    await sendCDP('DOM.enable');
    await sendCDP('CSS.enable');

    // Set viewport explicitly to 1440x900
    await sendCDP('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating Chrome to http://localhost:1420/?demo=1...');
    await sendCDP('Page.navigate', { url: 'http://localhost:1420/?demo=1' });

    // Wait 3s for Vue app to mount
    await new Promise(r => setTimeout(r, 3000));

    // Ensure all images are decoded and frames rendered
    console.log('Waiting for images and canvas to decode and paint...');
    await sendCDP('Runtime.evaluate', {
      expression: `
        (async function() {
          if (typeof window.__loadDemoData === 'function') {
            window.__loadDemoData();
          }
          const imgs = Array.from(document.querySelectorAll('img'));
          await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : img.decode().catch(() => {})));
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        })()
      `,
      awaitPromise: true
    });

    await new Promise(r => setTimeout(r, 2000));

    // 1. Capture Main Studio UI
    console.log('Capturing Main Studio UI with loaded video & subtitles...');
    const ss1 = await sendCDP('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      fromSurface: true
    });

    console.log('ss1 base64 length:', ss1 && ss1.data ? ss1.data.length : 0);

    if (ss1 && ss1.data && ss1.data.length > 5000) {
      fs.writeFileSync(path.join(outDir, 'app-studio-ui.jpg'), Buffer.from(ss1.data, 'base64'));
      fs.writeFileSync(path.join(docsOutDir, 'app-studio-ui.jpg'), Buffer.from(ss1.data, 'base64'));

      fs.writeFileSync(path.join(outDir, 'roi-selection.png'), Buffer.from(ss1.data, 'base64'));
      fs.writeFileSync(path.join(docsOutDir, 'roi-selection.png'), Buffer.from(ss1.data, 'base64'));
    } else {
      console.error('ss1 capture failed or returned tiny image data!');
    }

    // 2. Open Settings Modal
    console.log('Opening Settings Modal...');
    await sendCDP('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('header button[title*="配置"]');
        if (btn) btn.click();
      `
    });
    await new Promise(r => setTimeout(r, 1200));

    // 3. Capture Settings Modal UI
    const ss2 = await sendCDP('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
      fromSurface: true
    });

    console.log('ss2 base64 length:', ss2 && ss2.data ? ss2.data.length : 0);

    if (ss2 && ss2.data && ss2.data.length > 5000) {
      fs.writeFileSync(path.join(outDir, 'settings-modal.jpg'), Buffer.from(ss2.data, 'base64'));
      fs.writeFileSync(path.join(docsOutDir, 'settings-modal.jpg'), Buffer.from(ss2.data, 'base64'));
    }

    console.log('Capture process complete!');
    ws.close();
  } catch (err) {
    console.error('CDP capture error:', err);
  } finally {
    chromeProcess.kill();
  }
}

main().catch(console.error);
