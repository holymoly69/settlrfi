import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  followNewTab: false,
  fps: 60,
  videoFrame: {
    width: 1280,
    height: 720,
  },
  videoCrf: 18,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  aspectRatio: '16:9',
};

async function recordIntro() {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const htmlPath = path.join(__dirname, 'stlr-intro.html');
  const outputPath = path.join(__dirname, '..', 'attached_assets', 'stlr-intro.mp4');

  console.log('Loading HTML file...');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  console.log('Starting recording...');
  const recorder = new PuppeteerScreenRecorder(page, config);
  await recorder.start(outputPath);

  // Animation: 4s for main text + 12s for matrix strings cycling + buffer
  console.log('Recording animation for 16 seconds...');
  await new Promise(resolve => setTimeout(resolve, 16000));

  console.log('Stopping recording...');
  await recorder.stop();

  await browser.close();
  console.log(`Video saved to: ${outputPath}`);
}

recordIntro().catch(console.error);
