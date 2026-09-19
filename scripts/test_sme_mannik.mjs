import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSmeAndMannik() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });

  // 1. SME Grand Rapids / Locations
  console.log('--- Checking SME Grand Rapids ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.sme-usa.com/location/grand-rapids-michigan/', { waitUntil: 'networkidle2', timeout: 25000 });
    const smeData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({ id: f.id, action: f.action }));
      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      return { url: window.location.href, forms, mailtos, bodySnippet: document.body.innerText.slice(0, 1000) };
    });
    console.log('SME GR Data:', JSON.stringify(smeData, null, 2));
    await page.close();
  } catch (e) { console.log('SME GR err:', e.message); }

  // 2. Mannik Smith Group Homepage & Links
  console.log('--- Checking Mannik Smith Group Homepage ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://manniksmithgroup.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    const mannikData = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText.trim(),
        href: a.href
      })).filter(l => l.href.includes('manniksmithgroup.com'));
      const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
      return { linksSample: links.slice(0, 30), mailtos, bodySnippet: document.body.innerText.slice(0, 500) };
    });
    console.log('Mannik Data:', JSON.stringify(mannikData, null, 2));
    await page.close();
  } catch (e) { console.log('Mannik err:', e.message); }

  await browser.close();
}

checkSmeAndMannik();
