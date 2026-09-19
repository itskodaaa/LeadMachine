import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 3964, name: 'MEC Engineering', url: 'https://mec-e.com/contact-us' },
  { id: 3966, name: 'ALTEK Engineering', url: 'https://www.altek-eng.com/' },
  { id: 3967, name: 'PEI Florida', url: 'https://peiflorida.net/contact-us' },
  { id: 3968, name: 'Ribbeck Engineering', url: 'https://www.ribbeck.co/' },
  { id: 3969, name: 'The Engineering Company', url: 'https://www.engineeringcompany.com/contact-us' },
  { id: 3970, name: 'General Forensic Engineers', url: 'https://www.generalforensicengineers.com/' },
  { id: 3971, name: 'Metric Engineering', url: 'https://metriceng.com/contact/' },
  { id: 3972, name: 'Al-Farooq Corporation', url: 'https://afceng.com/' },
  { id: 3973, name: 'Choice Engineering', url: 'https://choiceeng.com/contact_us.html' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  for (const t of targets) {
    console.log(`\n========================================\n[#${t.id}] ${t.name}: ${t.url}`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(35000);
    page.setDefaultTimeout(20000);

    try {
      const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('Status:', resp ? resp.status() : 'null', 'URL:', page.url());

      // If page has redirect or links to contact
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|reach|touch/i.test(a.text) || /contact/i.test(a.href));
      });
      console.log('Contact links:', contactLinks.slice(0, 4));

      // Check forms, iframes, and captchas
      const details = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          name: f.name,
          action: f.action,
          class: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            text: i.innerText
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
        const captchas = Array.from(document.querySelectorAll('[class*="recaptcha"], [class*="turnstile"], [id*="recaptcha"], [class*="h-captcha"], [data-sitekey]')).map(c => ({
          class: c.className,
          id: c.id,
          sitekey: c.getAttribute('data-sitekey')
        }));

        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return { forms, iframes, captchas, emails };
      });

      console.log('Details:', JSON.stringify(details, null, 2));

    } catch (e) {
      console.log(`Error on #${t.id}: ${e.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspect();
