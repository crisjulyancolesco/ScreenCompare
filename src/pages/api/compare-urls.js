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

// Utility to sanitize URL paths for filenames
const sanitizeFilename = (url) => {
  return url
    .replace(/https?:\/\//, '') // Remove protocol
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric characters
    .replace(/_{2,}/g, '_'); // Replace multiple underscores with a single one
};

// Handler function
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { url1, url2, region, pages, compareType = 'visual', threshold = 0.1 } = req.body;

    try {
      if (!url1 || !url2) {
        return res.status(400).json({ message: 'Both URLs are required.' });
      }

      // Ensure pages is an array
      const pageUrls1 = Array.isArray(pages) ? pages.map(p => url1 + p) : [url1];
      const pageUrls2 = Array.isArray(pages) ? pages.map(p => url2 + p) : [url2];

      const filenames1 = pageUrls1.map(url => path.join(screenshotPath, `screenshot1_${sanitizeFilename(url)}.png`));
      const filenames2 = pageUrls2.map(url => path.join(screenshotPath, `screenshot2_${sanitizeFilename(url)}.png`));
      const diffFilenames = pageUrls1.map(url => path.join(screenshotPath, `diff_${sanitizeFilename(url)}.png`));

      // Capture screenshots for all pages
      await Promise.all(pageUrls1.map((pageUrl, index) => captureScreenshot(pageUrl, filenames1[index], region)));
      await Promise.all(pageUrls2.map((pageUrl, index) => captureScreenshot(pageUrl, filenames2[index], region)));

      // Check dimensions and compare images
      const comparisonResults = await Promise.all(filenames1.map(async (filename1, index) => {
        const filename2 = filenames2[index];
        const diffFilename = diffFilenames[index];

        const dimensions1 = getImageDimensions(filename1);
        const dimensions2 = getImageDimensions(filename2);

        if (dimensions1.width !== dimensions2.width || dimensions1.height !== dimensions2.height) {
          return {
            message: 'Images have different dimensions',
            dimensions1,
            dimensions2,
            dimensionMismatch: true,
            screenshot1: `/screenshots/${path.basename(filenames1[index])}`,
            screenshot2: `/screenshots/${path.basename(filenames2[index])}`,
          };
        }

        const comparisonResult = compareImages(filename1, filename2, diffFilename, threshold);

        return {
          message: 'Comparison complete',
          numDiffPixels: comparisonResult.numDiffPixels,
          diffImage: `/screenshots/${path.basename(diffFilename)}`,
          screenshot1: `/screenshots/${path.basename(filenames1[index])}`,
          screenshot2: `/screenshots/${path.basename(filenames2[index])}`,
        };
      }));

      res.json({ results: comparisonResults });

    } catch (error) {
      console.error('Error comparing URLs:', error);
      res.status(500).json({ message: 'Error comparing URLs', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
