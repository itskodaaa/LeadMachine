import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 3589, name: 'Firefly CNC', url: 'https://fireflycnc.com' },
  { id: 3590, name: 'LTD Material LLC', url: 'https://ltdmaterial.com' },
  { id: 3591, name: 'One Source Manufacturing Tech LLC', url: 'https://osmtech.com' },
  { id: 3592, name: 'Striking Precision Welding and Fabrication', url: 'https://strikingprecisionwelding.com' },
  { id: 3594, name: 'Dogwood Engineering', url: 'https://dogwoodengineering.com' },
  { id: 3595, name: 'Bolton & Menk, Inc.', url: 'https://bolton-menk.com' },
  { id: 3596, name: 'JRH Engineering', url: 'https://jrhengineering.net' },
  { id: 3598, name: 'CDG', url: 'https://shieldengineering.com' },
  { id: 3599, name: 'Tyndall Engineering & Design', url: 'https://tyndallengineering.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const l of leads) {
    const page = await browser.newPage();
    page.on('dialog', async d => { await d.dismiss(); });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    console.log(`\n--- Inspecting #${l.id} ${l.name} (${l.url}) ---`);
    try {
      const resp = await page.goto(l.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => ({ error: e.message }));
      if (resp && resp.error) {
        console.log(`Navigation error: ${resp.error}`);
        // try http
        const httpUrl = l.url.replace('https://', 'http://');
        console.log(`Trying http: ${httpUrl}`);
        const resp2 = await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => ({ error: e.message }));
        if (resp2 && resp2.error) {
          console.log(`Http navigation error: ${resp2.error}`);
        } else {
          console.log(`Loaded via http: ${page.url()}`);
        }
      } else {
        console.log(`Loaded: ${page.url()} (Status: ${resp ? resp.status?.() : 'ok'})`);
      }

      const title = await page.title();
      console.log(`Title: ${title}`);

      // Check forms, iframes, captchas, links
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const contactLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|about/i.test(a.text) || /contact|quote/i.test(a.href))
          .slice(0, 5);

        const formDetails = forms.map((f, i) => {
          const action = f.action;
          const method = f.method;
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }));
          return { index: i, action, method, inputsCount: inputs.length, inputs };
        });

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.className || c.src || c.getAttribute('data-sitekey'));

        return { formDetails, iframes: iframes.slice(0, 5), contactLinks, captchas, bodySnippet: document.body?.innerText?.slice(0, 300) };
      });

      console.log('Forms:', JSON.stringify(info.formDetails, null, 2));
      console.log('Captchas:', info.captchas);
      console.log('Contact links:', info.contactLinks);
      console.log('Body snippet:', info.bodySnippet?.replace(/\s+/g, ' ').slice(0, 150));
    } catch (e) {
      console.log(`Error: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
