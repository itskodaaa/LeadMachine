import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function examineTarget(url, name) {
  console.log(`\n========================================`);
  console.log(`Examining ${name}: ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });

  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));
    console.log(`Current URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    const data = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const iframes = Array.from(document.querySelectorAll('iframe')).map(i => ({ src: i.src, name: i.name, id: i.id, title: i.title }));
      const formInfo = forms.map((f, i) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => {
          const label = inp.id ? document.querySelector(`label[for="${inp.id}"]`)?.innerText : '';
          const parentLabel = inp.closest('label')?.innerText || inp.closest('.form-group, .field, div')?.querySelector('label')?.innerText || '';
          return {
            tag: inp.tagName.toLowerCase(),
            type: inp.type,
            name: inp.name,
            id: inp.id,
            placeholder: inp.placeholder,
            label: label || parentLabel,
            required: inp.required
          };
        });
        const buttons = Array.from(f.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(b => b.innerText || b.value);
        return { index: i, id: f.id, action: f.action, method: f.method, inputs, buttons };
      });

      // Also look for standalone inputs not in a form
      const standalone = Array.from(document.querySelectorAll('input, textarea')).filter(el => !el.closest('form')).map(inp => ({
        tag: inp.tagName.toLowerCase(),
        type: inp.type,
        name: inp.name,
        id: inp.id,
        placeholder: inp.placeholder
      }));

      return { formInfo, iframes, standalone, bodySnippet: document.body?.innerText?.slice(0, 500) };
    });

    console.log(`Forms found: ${data.formInfo.length}`);
    console.log(JSON.stringify(data.formInfo, null, 2));
    console.log(`Iframes found: ${data.iframes.length}`);
    console.log(JSON.stringify(data.iframes, null, 2));
    if (data.standalone.length > 0) {
      console.log(`Standalone inputs found:`, data.standalone);
    }
  } catch (e) {
    console.log(`Error examining ${name}: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  const targets = [
    { name: '#4139 L Squared (contact)', url: 'https://www.l2engineering.com/contact-us' },
    { name: '#4139 L Squared (quote)', url: 'https://www.l2engineering.com/get-a-quote' },
    { name: '#4140 Las Haciendas', url: 'https://hdeplans.com' },
    { name: '#4141 Middleton Brown', url: 'http://www.middletonbrown.net' },
    { name: '#4141 Middleton Brown (contact)', url: 'http://www.middletonbrown.net/contacts.htm' },
    { name: '#4142 VLZ Homes', url: 'https://vlzhomes-renovations.com/contact-us' },
    { name: '#4143 HTS Inc', url: 'https://htshouston.com/contact/' },
    { name: '#4145 EHRA Engineering', url: 'https://ehra.team/contact-us' },
    { name: '#4146 HRA Engineering', url: 'https://hra-eng.com' },
    { name: '#4147 NOMA Engineering', url: 'https://nomaengineering.com' },
    { name: '#4148 MPCE', url: 'https://mpce-tx.com/contact' },
  ];

  for (const t of targets) {
    await examineTarget(t.url, t.name);
  }
}

run().catch(console.error);
