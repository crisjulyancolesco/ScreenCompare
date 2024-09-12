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
const captureScreenshot = async (url, filename, clip = null) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Capture full page or specific region
  await page.screenshot({ path: filename, fullPage: !clip, clip });
  await browser.close();
  console.log(`Screenshot saved: ${filename}`);
  return filename;
};

// Utility to read image dimensions from a PNG file
const getImageDimensions = (imgPath) => {
  const img = PNG.sync.read(fs.readFileSync(imgPath));
  return { width: img.width, height: img.height };
};

// Utility to compare two images using pixelmatch
const compareImages = (img1Path, img2Path, diffPath, threshold = 0.1) => {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  return { numDiffPixels };
};

// Handler function
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { url1, url2, region, compareType = 'visual', threshold = 0.1 } = req.body;

    try {
      if (!url1 || !url2) {
        return res.status(400).json({ message: 'Both URLs are required.' });
      }

      const filename1 = path.join(screenshotPath, 'screenshot1.png');
      const filename2 = path.join(screenshotPath, 'screenshot2.png');
      const diffFilename = path.join(screenshotPath, 'diff.png');

      // Option for capturing a specific region
      const clip = region ? { x: region.x, y: region.y, width: region.width, height: region.height } : null;

      // Capture screenshots
      await captureScreenshot(url1, filename1, clip);
      await captureScreenshot(url2, filename2, clip);

      // Check dimensions of both screenshots
      const dimensions1 = getImageDimensions(filename1);
      const dimensions2 = getImageDimensions(filename2);

      // Return immediately if the dimensions do not match
      if (dimensions1.width !== dimensions2.width || dimensions1.height !== dimensions2.height) {
        return res.json({
          message: 'Images have different dimensions',
          dimensions1,
          dimensions2,
          dimensionMismatch: true,  // This flag should be set to true
          screenshot1: '/screenshots/screenshot1.png',
          screenshot2: '/screenshots/screenshot2.png',
        });
      }

      // Proceed with image comparison if dimensions are the same
      const comparisonResult = compareImages(filename1, filename2, diffFilename, threshold);

      res.json({
        message: 'Comparison complete',
        numDiffPixels: comparisonResult.numDiffPixels,
        diffImage: '/screenshots/diff.png',
        screenshot1: '/screenshots/screenshot1.png',
        screenshot2: '/screenshots/screenshot2.png',
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
