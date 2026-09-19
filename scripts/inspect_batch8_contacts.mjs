import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const contactUrls = [
  { id: 2283, name: 'Danforth', url: 'https://www.danforthcg.com/contact/' },
  { id: 2284, name: 'Alvakanda', url: 'https://www.avkdcompany.com/contact' },
  { id: 2290, name: 'Crowder', url: 'https://www.crowderusa.com/contact-us' },
  { id: 2281, name: 'Canelli', url: 'https://www.canelliconstruction.com/contact' },
  { id: 2282, name: 'Harmon', url: 'https://harmonconstsvc.com/contacts/' },
  { id: 2289, name: 'Domino', url: 'https://dominoconstructionllc.com/contact' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  for (const c of contactUrls) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    console.log(`\n========================================\n[${c.id}] ${c.name}: ${c.url}`);

    try {
      const resp = await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('Status:', resp ? resp.status() : 'null', 'Final URL:', page.url());

      const data = await page.evaluate(() => {
        const title = document.title;
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
          idx: i,
          id: f.id,
          className: f.className,
          action: f.action,
          method: f.method,
          fields: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }))
        }));

        const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .cf-turnstile, [data-sitekey]')).map(c => c.tagName + ' ' + (c.className || '') + ' ' + (c.src || ''));

        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href);

        return { title, forms, iframes, captchas, mailtos };
      });

      console.log('Details:', JSON.stringify(data, null, 2));

    } catch (e) {
      console.log('Error:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect().catch(console.error);
