import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3514, name: 'Precision Design and Build ATX', url: 'https://precisionbuildatx.com/contact/' },
  { id: 3516, name: 'Spradling Engineering, LLC', url: 'https://spradlingengineering.com/contact-us/' },
  { id: 3518, name: 'Texas Institute for Electronics', url: 'https://txie.org/' },
  { id: 3520, name: 'DunAn Microstaq (DMQ)', url: 'http://dmq-us.com/' },
  { id: 3522, name: 'Clandestine Product Development', url: 'https://www.clandestinepd.com/contact/' }
];

async function inspectStatic() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    try {
      console.log(`\n========================================`);
      console.log(`Inspecting #${lead.id}: ${lead.name} (${lead.url})`);
      await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 });

      const res = await page.evaluate(() => {
        const text = document.body.innerText.replace(/\s+/g, ' ').slice(0, 1000);
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => i.name || i.id || i.type)
        }));
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const phones = Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => a.href);

        return {
          title: document.title,
          url: window.location.href,
          forms,
          mailtos: [...new Set(mailtos)],
          phones: [...new Set(phones)],
          textSnippet: text
        };
      });

      console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e) {
      console.log(`Failed #${lead.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectStatic();
