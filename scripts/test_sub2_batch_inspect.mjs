import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3556, name: "Coefficient Engineering LLC", url: "https://www.coefficientengr.com" },
  { id: 3557, name: "Engineering Square LLC", url: "https://www.engineeringsquare.us" },
  { id: 3558, name: "P.E. Structural Consultants", url: "https://www.hardestyhanover.com" },
  { id: 3560, name: "Foresight Planning & Engineering", url: "https://www.foresightpes.com" },
  { id: 3561, name: "Geosyntec Consultants", url: "https://www.geosyntec.com" },
  { id: 3562, name: "Novus Engineering", url: "https://novus-engineering.com" },
  { id: 3563, name: "Way Consulting Engineers", url: "https://www.wayengineering.com" },
  { id: 3564, name: "Thonhoff Consulting Engineers", url: "https://tcetx.com" },
  { id: 3566, name: "Cammaster Machining", url: "https://www.cammastermachining.com" },
  { id: 3567, name: "Priority Bending", url: "https://www.prioritybending.com" }
];

async function inspectAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--disable-web-security']
  });

  for (const lead of leads) {
    console.log(`\n==================================================`);
    console.log(`[Lead #${lead.id}] Inspecting: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.log(`Initial goto error: ${e.message}`);
    }

    try {
      const info = await page.evaluate(() => {
        const title = document.title;
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
          src: f.src,
          title: f.title
        }));

        const contactLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|quote|touch|connect/i.test(a.text) || /contact|quote/i.test(a.href));

        const bodyText = document.body.innerText;
        const emails = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const captchas = {
          recaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
          hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
          turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]')
        };

        return {
          title,
          url: window.location.href,
          formCount: forms.length,
          forms,
          iframesCount: iframes.length,
          contactLinks: contactLinks.slice(0, 5),
          emails: [...new Set(emails)].slice(0, 5),
          captchas
        };
      });

      console.log('Result:', JSON.stringify(info, null, 2));
    } catch (e) {
      console.log(`Evaluation error: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
}

inspectAll().catch(console.error);
