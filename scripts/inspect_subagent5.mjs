import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 3535, name: 'Pro-Air Engineering Inc', url: 'https://proairtexas.com/contact/' },
  { id: 3536, name: 'ATX Environmental Solutions', url: 'https://www.atxesl.com/' },
  { id: 3537, name: 'TDIndustries, Inc.', url: 'https://www.tdindustries.com/contact-us' },
  { id: 3538, name: 'Terrapin Electric', url: 'https://terrapinelectric.com/contact/' },
  { id: 3541, name: 'SCIVIC Engineering America Inc.', url: 'https://www.ae-industry.com/contact' },
  { id: 3543, name: 'Braun Intertec Corporation', url: 'https://braunintertec.com/contact' },
  { id: 3544, name: 'Cypress Industries', url: 'https://www.cypressindustries.com/contact/index.html' },
  { id: 3545, name: 'Mass Product Development LLC', url: 'http://mass-pd.com' }
];

async function inspectTargets() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`🔍 Inspecting #${t.id}: ${t.name} (${t.url})`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    try {
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 25000 }).catch(async () => {
        await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      });
      await new Promise(r => setTimeout(r, 2000));

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const captchas = {
          recaptcha: !!document.querySelector('.g-recaptcha, [src*="recaptcha"], iframe[src*="google.com/recaptcha"]'),
          hcaptcha: !!document.querySelector('.h-captcha, [src*="hcaptcha"]'),
          turnstile: !!document.querySelector('.cf-turnstile, [src*="turnstile"]')
        };
        const emails = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0]);
        const formDetails = forms.map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({
            text: (b.innerText || b.value || '').trim(),
            type: b.type
          }));
          return { index: i, action: f.action, id: f.id, inputCount: inputs.length, inputs, buttons };
        });
        return {
          currentUrl: window.location.href,
          title: document.title,
          emails,
          captchas,
          iframeCount: iframes.length,
          iframes: iframes.filter(s => s && !s.includes('doubleclick') && !s.includes('googletagmanager')).slice(0, 5),
          forms: formDetails
        };
      });

      console.log(`Page Info:`, JSON.stringify(info, null, 2));

    } catch (e) {
      console.log(`Error inspecting #${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectTargets();
