import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3672, name: 'United Mechanical', urls: ['https://unitedhvac.com/contact/', 'https://unitedhvac.com/contact-us/', 'https://unitedhvac.com/'] },
  { id: 3674, name: 'MIAS Inc', urls: ['https://mias-group.com/en/contact/', 'https://mias-group.com/contact/', 'https://mias-group.com/'] },
  { id: 3675, name: 'Morris-Jenkins', urls: ['https://morrisjenkins.com/about/contact/', 'https://morrisjenkins.com/contact/'] },
  { id: 3676, name: 'Coefficient Engineers', urls: ['https://coefficientengineers.com/contact/', 'https://coefficientengineers.com/'] },
  { id: 3677, name: 'Wildlands Engineering', urls: ['https://www.wildlandseng.com/contact-us/', 'https://www.wildlandseng.com/contact/', 'https://www.wildlandseng.com/'] },
  { id: 3678, name: 'DELTA |v|', urls: ['https://www.deltavinc.com/contact/', 'https://www.deltavinc.com/'] },
  { id: 3680, name: 'CADdesignhelp', urls: ['https://caddesignhelp.com/contact-us/', 'https://caddesignhelp.com/contact/', 'https://caddesignhelp.com/'] },
  { id: 3681, name: 'System One', urls: ['https://www.systemone.com/contact/'] }
];

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const lead of leads) {
    console.log(`\n========================================\nChecking Lead #${lead.id}: ${lead.name}`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    let foundUrl = null;
    for (const url of lead.urls) {
      try {
        console.log(`Trying ${url}...`);
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const status = resp ? resp.status() : 0;
        console.log(`Status: ${status}, Title: ${await page.title()}`);
        if (status < 400) {
          foundUrl = url;
          break;
        }
      } catch (e) {
        console.log(`Failed to navigate to ${url}: ${e.message}`);
      }
    }

    if (foundUrl) {
      await new Promise(r => setTimeout(r, 2000));
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }));
          const btn = f.querySelector('button, input[type="submit"]');
          return {
            id: f.id,
            action: f.action,
            method: f.method,
            inputs,
            btnText: btn ? (btn.innerText || btn.value) : null
          };
        });

        // Check captchas
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
        const hasHCaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare.com"]');

        return { forms, hasRecaptcha, hasHCaptcha, hasTurnstile, url: window.location.href };
      });

      console.log(`Result for ${lead.name}: at ${info.url}`);
      console.log(`Captchas: reCAPTCHA=${info.hasRecaptcha}, hCaptcha=${info.hasHCaptcha}, Turnstile=${info.hasTurnstile}`);
      console.log(`Found ${info.forms.length} forms:`);
      for (let i = 0; i < info.forms.length; i++) {
        console.log(` Form ${i}: action=${info.forms[i].action}, btn=${info.forms[i].btnText}`);
        console.log(`   inputs: ${info.forms[i].inputs.map(inp => `${inp.name || inp.id} (${inp.type})`).join(', ')}`);
      }
    }
    await page.close();
  }

  await browser.close();
}

main().catch(console.error);
