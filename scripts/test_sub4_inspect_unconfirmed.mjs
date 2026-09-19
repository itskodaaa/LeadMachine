import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const testLeads = [
  { id: 3682, name: 'MSS Solutions, LLC', url: 'https://msssolutions.com' },
  { id: 3683, name: 'Team Mechanical, LLC', url: 'https://team-mech.com' },
  { id: 3685, name: 'Bahnson Mechanical Systems', url: 'https://bahnson.com' },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of testLeads) {
    const page = await browser.newPage();
    try {
      console.log(`\n--- Inspecting #${lead.id} ${lead.name} ---`);
      await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('goto err:', e.message));
      console.log('Current URL:', page.url());

      // Look for contact link
      const contactUrl = await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a')).find(el => /contact/i.test(el.innerText) || /contact/i.test(el.href));
        return a ? a.href : null;
      });
      console.log('Found contact link:', contactUrl);
      if (contactUrl && contactUrl !== page.url()) {
        await page.goto(contactUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('contact goto err:', e.message));
        console.log('Navigated to contact page:', page.url());
      }

      // Check forms and captchas
      const formDetails = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(f => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }));
          const captchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile')).map(c => c.className || c.src);
          return {
            id: f.id,
            action: f.action,
            inputs,
            captchas,
            submitBtn: f.querySelector('button, input[type="submit"]')?.innerText || f.querySelector('button, input[type="submit"]')?.value
          };
        });
      });

      console.log('Forms on contact page:', JSON.stringify(formDetails, null, 2));

      // Also check iframes
      const iframes = await page.evaluate(() => Array.from(document.querySelectorAll('iframe')).map(i => ({ id: i.id, src: i.src })));
      console.log('Iframes:', iframes);

    } catch (e) {
      console.log('Error:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
