import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 4717, name: 'MR Steel', url: 'https://www.mrsteel.us/contact' },
  { id: 4718, name: 'Medford Knife & Tool', url: 'https://medfordknife.com/contact/' },
  { id: 4719, name: "Cupp's Industrial Supply", url: 'https://www.cuppsind.com/contact/' },
  { id: 4720, name: 'Kaplan Steel Rule Die Manufacturing', url: 'https://kaplanmfg.com/' },
  { id: 4721, name: 'Accuzona Steel Rule Die Inc', url: 'https://accuzona.com/index.php/contact/' },
  { id: 4723, name: 'Foundry Tool & Mold Service', url: 'https://foundrytool.com/Contact.html' },
  { id: 4724, name: 'Precision Die & Stamping Inc', url: 'https://precisiondie.com/contact' },
  { id: 4725, name: 'Toolcraft of Phoenix Inc.', url: 'https://aztoolcraft.com/#contact' },
  { id: 4727, name: 'Construction Tool & Supply', url: 'https://constructiontoolusa.com/contact' }
];

async function deepInspect() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n========================================\nExamining Lead ${t.id}: ${t.name} -> ${t.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => {
        console.log(`Goto error: ${e.message}`);
        return null;
      });
      await new Promise(r => setTimeout(r, 3000));
      console.log(`Status: ${res ? res.status() : 'failed'}, Current URL: ${page.url()}`);

      const details = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const elements = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            value: el.value || '',
            required: el.required,
            className: el.className || '',
            text: el.innerText || ''
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"], [role="button"]')).map(b => b.innerText || b.value || '');
          const iframes = Array.from(f.querySelectorAll('iframe')).map(iframe => iframe.src);
          return {
            index: i,
            id: f.id,
            action: f.action,
            method: f.method,
            elements,
            buttons,
            iframes
          };
        });

        // Captchas or honeypots on page
        const recaptcha = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .h-captcha')).map(e => e.outerHTML.slice(0, 100));
        
        // Emails / mailto
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return { forms, recaptcha, mailtos };
      });

      console.log(`Forms count: ${details.forms.length}`);
      console.log(`Recaptchas:`, details.recaptcha);
      console.log(`Mailtos:`, details.mailtos);
      if (details.forms.length > 0) {
        console.log(`Forms detail:`, JSON.stringify(details.forms, null, 2));
      }
    } catch (err) {
      console.error(`Error:`, err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

deepInspect();
