import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3872, name: 'Hamilton Engineering & Surveying, LLC', url: 'https://hamiltonengineering.us' },
  { id: 3873, name: 'McAdams', url: 'https://mcadamsco.com' },
  { id: 3874, name: 'Tampa Bay Machining', url: 'https://tampabaymachining.com' },
  { id: 3875, name: 'Reserve Advisors', url: 'https://reserveadvisors.com' },
  { id: 3876, name: 'Rinker Machine Shop', url: 'https://rinkermachineshop.com' },
  { id: 3877, name: 'ACM Engineering & Environmental Services', url: 'https://acmenv.com' },
  { id: 3878, name: 'MRIC Spatial', url: 'https://mricspatial.com' },
  { id: 3879, name: 'Engineering & Manufacturing Services, Inc (EMS3D)', url: 'https://ems3d.com' },
  { id: 3880, name: 'Precision GPR', url: 'https://precisiongpr.com' },
  { id: 3881, name: 'Southern Manufacturing Technologies, Inc.', url: 'https://smt-tampa.com' },
];

async function inspectAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n==================================================\n[#${lead.id}] ${lead.name} -> ${lead.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      
      let res;
      try {
        res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (err) {
        console.log(`Initial goto failed: ${err.message}. Trying alt...`);
        try {
          const altUrl = lead.url.includes('www.') ? lead.url.replace('www.', '') : lead.url.replace('https://', 'https://www.');
          res = await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (err2) {
          console.log(`Alt goto failed: ${err2.message}`);
        }
      }

      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());

      const data = await page.evaluate(() => {
        const bodyText = document.body ? document.body.innerText : '';
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            idx: i,
            id: f.id,
            action: f.action,
            fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder
            }))
          };
        });

        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.innerText.trim().replace(/\s+/g, ' '),
          href: a.href
        })).filter(l => /contact|about|touch|reach|estimate|quote|connect/i.test(l.text) || /contact|about|touch|reach|quote/i.test(l.href));

        const captchas = {
          recaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
          hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
          turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare"]')
        };

        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return {
          formsCount: forms.length,
          forms,
          captchas,
          links: links.slice(0, 8),
          mailtos: [...new Set(mailtos)]
        };
      });

      console.log('Forms:', JSON.stringify(data.forms, null, 2));
      console.log('Captchas:', data.captchas);
      console.log('Mailtos:', data.mailtos);
      console.log('Links:', data.links);

    } catch (e) {
      console.log('Error inspecting lead:', e.message);
    } finally {
      try { await page.close(); } catch (_) {}
    }
  }

  await browser.close();
}

inspectAll();
