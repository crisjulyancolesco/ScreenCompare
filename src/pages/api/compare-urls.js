import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const screenshotPath = path.join(process.cwd(), 'public', 'screenshots');

// Ensure the screenshots directory exists
if (!fs.existsSync(screenshotPath)) {
  fs.mkdirSync(screenshotPath, { recursive: true });
}

// Utility to capture a screenshot for a given URL
const captureScreenshot = async (url, filename) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: filename, fullPage: true });
  await browser.close();
  console.log(`Screenshot saved: ${filename}`);
  return filename;
};

// Utility to compare two images using pixelmatch
const compareImages = (img1Path, img2Path, diffPath) => {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  if (img1.width !== img2.width || img1.height !== img2.height) {
    throw new Error('Images have different dimensions');
  }

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return numDiffPixels;
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { url1, url2 } = req.body;

    try {
      if (!url1 || !url2) {
        return res.status(400).json({ message: 'Both URLs are required.' });
      }

      const filename1 = path.join(screenshotPath, 'screenshot1.png');
      const filename2 = path.join(screenshotPath, 'screenshot2.png');
      const diffFilename = path.join(screenshotPath, 'diff.png');

      await captureScreenshot(url1, filename1);
      await captureScreenshot(url2, filename2);

      const numDiffPixels = compareImages(filename1, filename2, diffFilename);

      res.json({
        message: 'Comparison complete',
        numDiffPixels,
        diffImage: '/screenshots/diff.png',
        screenshot1: '/screenshots/screenshot1.png',
        screenshot2: '/screenshots/screenshot2.png'
      });
    } catch (error) {
      console.error('Error comparing URLs:', error);
      res.status(500).json({ message: 'Error comparing URLs', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
