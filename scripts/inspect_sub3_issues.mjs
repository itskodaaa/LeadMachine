import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspect(url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n============================\nVisiting: ${url}`);
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log(`Final URL: ${page.url()}`);
    console.log(`Status: ${res?.status()}`);
    const title = await page.title();
    console.log(`Title: ${title}`);

    const details = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => /contact|quote|about/i.test(l.text) || /contact|quote/i.test(l.href));
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        required: el.required
      }));
      const textSnippet = document.body ? document.body.innerText.slice(0, 500) : '';
      return { formsCount: forms.length, iframes, links: links.slice(0, 10), inputs, textSnippet };
    });

    console.log('Details:', JSON.stringify(details, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  const targets = [
    'https://lm3technologies.com',
    'https://gmmco.com',
    'https://dmcinfo.com',
    'https://logicgate-engineering.com',
    'https://kocsisusa.com',
    'https://cdtcncmachiningservices.com'
  ];
  for (const t of targets) {
    await inspect(t);
  }
}

run();
