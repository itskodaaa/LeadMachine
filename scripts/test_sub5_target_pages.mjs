import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 4429, name: 'ICE', url: 'https://iceagents.com/index.php/contact/' },
  { id: 4430, name: 'Paradigm', url: 'https://paradigmeng.net/' },
  { id: 4431, name: 'Arseal', url: 'https://arseal.com/contact/' },
  { id: 4432, name: 'Exordium', url: 'https://exordiumengineering.com/' },
  { id: 4433, name: 'Dynabal', url: 'https://dynabal.com/contact.html' },
  { id: 4436, name: 'Precision Meas', url: 'https://precision-measurements.com/contact.shtml' },
  { id: 4436, name: 'Precision Meas PHP', url: 'https://precision-measurements.com/pm-home-contact.php' },
  { id: 4437, name: 'DPE / Thomas & Hutton', url: 'https://www.thomasandhutton.com/contact/' },
  { id: 4438, name: 'Concept Eng', url: 'https://conceptengrs.net/contact' }
];

async function inspectTargets() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n================== Checking ${t.id}: ${t.name} (${t.url}) ==================`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const details = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            text: el.innerText ? el.innerText.trim() : el.value
          }));
          return {
            index: i,
            id: f.id,
            action: f.action,
            inputs
          };
        });

        const textContent = document.body.innerText.slice(0, 500);
        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);
        const captchas = Array.from(document.querySelectorAll('[class*="captcha"], [id*="captcha"], [src*="recaptcha"], [src*="turnstile"], [src*="hcaptcha"], .g-recaptcha')).map(el => el.outerHTML.slice(0, 100));

        return {
          title: document.title,
          forms,
          emails,
          captchas,
          textSnippet: textContent.replace(/\s+/g, ' ').slice(0, 200)
        };
      });

      console.log(JSON.stringify(details, null, 2));
    } catch (e) {
      console.log(`Error: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectTargets();
