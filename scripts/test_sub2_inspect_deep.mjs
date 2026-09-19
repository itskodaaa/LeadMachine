import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4236, name: 'Precise Engineering', url: 'https://precise-engineering.net' },
  { id: 4237, name: 'Turner Precision Engineering', url: 'https://canibbletools.com' },
  { id: 4238, name: 'PND Engineers, Inc. Houston', url: 'https://pndengineers.com' },
  { id: 4239, name: 'VMC Precision LLC', url: 'https://vmcprecisionllc.com' },
  { id: 4240, name: 'Liberty Precision Company, LLC', url: 'https://libertypc.com' },
  { id: 4241, name: 'Rockwell Precision Inc', url: 'https://rpitex.com' },
  { id: 4242, name: 'TRILOGY PRECISION', url: 'https://trilogyprecision.com' },
  { id: 4243, name: 'Precision Machinery Contractors', url: 'https://precisionmachllc.com' },
  { id: 4244, name: 'Titanium Engineers Inc', url: 'https://titaniumengineers.com' },
  { id: 4245, name: 'FERPA Precision Machine Inc', url: 'https://ferpa-pmi.com' },
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n========================================\nExamining #${lead.id} ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    try {
      const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => {
        console.log(`Navigation error: ${e.message}`);
        return null;
      });

      if (!resp) {
        console.log(`Failed to load ${lead.url}`);
        await page.close();
        continue;
      }

      console.log(`HTTP status: ${resp.status()}`);
      console.log(`Final URL: ${page.url()}`);
      const title = await page.title();
      console.log(`Title: ${title}`);

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|reach|about|inquiry/i.test(a.text) || /contact|quote/i.test(a.href));
      });
      console.log(`Contact / Quote links:`, JSON.stringify(links.slice(0, 8)));

      // Check forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          return {
            formIdx: i,
            action: f.action,
            method: f.method,
            inputs
          };
        });
      });
      console.log(`Forms found: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms, null, 2));
      }

      // Check for captchas
      const captchas = await page.evaluate(() => {
        const hasRecaptcha = !!document.querySelector('iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]');
        const hasHCaptcha = !!document.querySelector('iframe[src*="hcaptcha"], .h-captcha');
        const hasTurnstile = !!document.querySelector('iframe[src*="challenges.cloudflare"], .cf-turnstile');
        return { hasRecaptcha, hasHCaptcha, hasTurnstile };
      });
      console.log(`Captchas:`, JSON.stringify(captchas));

    } catch (err) {
      console.log(`Error inspecting #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
