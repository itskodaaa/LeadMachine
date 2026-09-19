import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspect(leadId, url) {
  console.log(`\n================== Inspecting #${leadId} (${url}) ==================`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  try {
    let fullUrl = url.startsWith('http') ? url : 'https://' + url;
    console.log(`Navigating to ${fullUrl}...`);
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch(e) {
      if (fullUrl.startsWith('https://')) {
        fullUrl = fullUrl.replace('https://', 'http://');
        console.log(`Retrying http: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } else {
        throw e;
      }
    }
    console.log(`Landed on: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    // Look for contact links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(l => /contact|reach|connect|touch|inquir|quote|get-in-touch/i.test(l.text) || /contact/i.test(l.href));
    });
    console.log('Contact links found:', links.slice(0, 5));

    // Check forms on current page
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
          tag: inp.tagName,
          type: inp.type,
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder
        }));
        const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value);
        return { index: i, action: f.action, method: f.method, className: f.className, id: f.id, inputs, buttons };
      });
    });
    console.log(`Forms found: ${forms.length}`);
    if (forms.length > 0) {
      console.log(JSON.stringify(forms, null, 2));
    }

  } catch (e) {
    console.error(`Error inspecting #${leadId}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  const targets = [
    [1031, 'rbdengineering.com'],
    [1032, 'haegerengineering.com'],
    [1033, 'moshecal.com'],
    [1035, 'thestructuralshop.com'],
    [1036, 'dbsterlin.com'],
    [1038, 'ckleng.com'],
    [1039, 'ecslimited.com'],
    [1041, 'orionengineersllc.com'],
    [1042, 'burnsmcd.com'],
    [1044, 'gec-group.com']
  ];

  for (const [id, url] of targets) {
    await inspect(id, url);
  }
}

run();
