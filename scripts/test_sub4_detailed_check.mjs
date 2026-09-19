import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkTargets() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const targets = [
    { id: 3874, name: 'Tampa Bay Machining', url: 'https://www.tampabaymachining.com/contact-us/' },
    { id: 3876, name: 'Rinker Machine Shop', url: 'https://www.rinkermachineshop.com/get-a-quote' },
    { id: 3877, name: 'ACM Engineering & Environmental Services', url: 'https://www.acmenv.com/' },
    { id: 3878, name: 'MRIC Spatial', url: 'https://mricspatial.com' },
    { id: 3879, name: 'EMS3D Contact', url: 'https://ems3d.com/ems-contact-form/' },
    { id: 3879, name: 'EMS3D Quote', url: 'https://ems3d.com/get-a-service-quote/' },
    { id: 3880, name: 'Precision GPR', url: 'https://precisiongpr.com/contact-us/' },
    { id: 3881, name: 'SMT Tampa', url: 'https://smt-tampa.com' }
  ];

  for (const t of targets) {
    console.log(`\n========================================\nChecking #${t.id} ${t.name}: ${t.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('HTTP status:', res ? res.status() : 'none');
      console.log('Title:', await page.title());
      console.log('Final URL:', page.url());

      const details = await page.evaluate(() => {
        const body = document.body ? document.body.innerText : '';
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
          idx: i,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const captchas = {
          recaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
          hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
          turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare"]')
        };

        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return {
          bodySnippet: body.slice(0, 300).replace(/\n+/g, ' '),
          formsCount: forms.length,
          forms,
          iframes,
          captchas,
          mailtos: [...new Set(mailtos)]
        };
      });

      console.log('Details:', JSON.stringify(details, null, 2));
    } catch (e) {
      console.log('Error checking target:', e.message);
    } finally {
      try { await page.close(); } catch (_) {}
    }
  }

  await browser.close();
}

checkTargets();
