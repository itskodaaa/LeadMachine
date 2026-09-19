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
    { id: 4042, name: 'Victores Machine Shop', url: 'https://victoresmachineshop.com' },
    { id: 4043, name: 'MWL Engineering Corporation-Alsfab', url: 'https://mwleng.com' },
    { id: 4044, name: 'RWS Engineering Inc', url: 'https://rwsengineering.com' },
    { id: 4045, name: 'Associated Machine Co.', url: 'https://assocmachine.com' },
    { id: 4046, name: 'Alvarez Engineers', url: 'https://alvarezeng.com' },
    { id: 4047, name: 'NiceCold Engineering AC Repairs', url: 'https://nicecoldengineeringacrepairs.com' },
    { id: 4048, name: 'Xpress Precision Products Inc', url: 'https://xpressprecisionproducts.com' },
    { id: 4049, name: 'Leslie Engineering OEM Inc', url: 'https://leslie-engineering.com' },
    { id: 4050, name: 'Precision Tech Aero, Inc.', url: 'https://ptaero.com' }
  ];

  for (const t of targets) {
    console.log(`\n========================================\nChecking #${t.id} ${t.name}: ${t.url}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      console.log('HTTP status:', res ? res.status() : 'none');
      console.log('Title:', await page.title());
      console.log('Final URL:', page.url());

      // Let's find contact links as well
      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|quote|about|reach|get-in-touch|inquiry/i.test(a.href) || /contact|quote|about|reach|inquiry/i.test(a.innerText))
          .map(a => ({ text: a.innerText.trim(), href: a.href }));
      });
      console.log('Contact links:', contactLinks.slice(0, 5));

      const details = await page.evaluate(() => {
        const body = document.body ? document.body.innerText : '';
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
          idx: i,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            value: el.value,
            text: el.innerText
          }))
        }));

        const captchas = {
          recaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
          hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
          turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare"]')
        };

        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return {
          bodySnippet: body.slice(0, 200).replace(/\\s+/g, ' '),
          formsCount: forms.length,
          forms,
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
