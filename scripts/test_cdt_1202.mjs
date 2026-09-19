import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testCdT() {
  console.log('Testing headed browser on cdtcncmachiningservices.com ...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    const res = await page.goto('https://cdtcncmachiningservices.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log(`Status: ${res?.status()}, URL: ${page.url()}, Title: ${await page.title()}`);
    await new Promise(r => setTimeout(r, 6000));
    console.log(`After wait -> Title: ${await page.title()}, URL: ${page.url()}`);
    const body = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log(`Body snippet:\n${body}`);
  } catch (e) {
    console.error(`Error: ${e.message}`);
  } finally {
    await browser.close();
  }
}

testCdT();
