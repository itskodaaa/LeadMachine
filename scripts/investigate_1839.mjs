import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://metalworkshd.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Homepage title:', await page.title());

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('Links:', links);

    // Check contact page if any
    const contactLink = links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href));
    if (contactLink) {
      console.log('Going to contact link:', contactLink.href);
      await page.goto(contactLink.href, { waitUntil: 'networkidle2', timeout: 30000 });
      console.log('Contact page URL:', page.url());
      console.log('Contact page title:', await page.title());
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id }))
        }));
      });
      console.log('Forms on contact page:', forms);
      const captchas = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
          tag: c.tagName,
          src: c.getAttribute('src'),
          sitekey: c.getAttribute('data-sitekey')
        }));
      });
      console.log('Captchas on contact page:', captchas);
    }
  } catch (e) {
    console.log('Error 1839:', e.message);
  } finally {
    await browser.close();
  }
}

run();
