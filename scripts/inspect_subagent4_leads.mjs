import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 2963, name: "Delta General Contracting Inc", url: "https://deltageneralcontractinginc.com" },
  { id: 2964, name: "Giant First Construction Inc.", url: "https://giantfirstconstructioninc.com" },
  { id: 2965, name: "Panorama City Roof Repair & Commercial Roofing", url: "https://panoramacityroofrepair.com" },
  { id: 2966, name: "THE AFFORDABLE AND LICENSED HANDYMAN", url: "https://theaffordableandlicensedhandyman.com" },
  { id: 2967, name: "Gaines General Contracting", url: "https://houzz.com" },
  { id: 2970, name: "Bmk Construction", url: "https://bmkremodeling.com" },
  { id: 2971, name: "William Brothers Building & Construction", url: "https://william-brothers.com" },
  { id: 2972, name: "Flat Rate Remodeling Inc", url: "https://flatrateremodeling.com" },
  { id: 2973, name: "GreatBuildz", url: "https://greatbuildz.com" },
  { id: 2974, name: "AM Builds Inc", url: "https://ambuildersca.com" }
];

async function inspect() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const lead of leads) {
    console.log(`\n========================================\nChecking #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
      await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 25000 });
      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());

      // Inspect forms and elements
      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const formDetails = forms.map((f, i) => {
          const action = f.getAttribute('action') || '';
          const method = f.getAttribute('method') || '';
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => {
            return {
              tag: el.tagName.toLowerCase(),
              type: el.getAttribute('type'),
              name: el.getAttribute('name'),
              id: el.getAttribute('id'),
              placeholder: el.getAttribute('placeholder'),
              required: el.required
            };
          });
          const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim());
          return { index: i, action, method, inputCount: inputs.length, inputs, buttons };
        });

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));

        const contactLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|estimate|touch/i.test(a.text) || /contact|quote|estimate|touch/i.test(a.href))
          .slice(0, 5);

        return { formCount: forms.length, formDetails, captchas, contactLinks };
      });

      console.log('Forms found:', info.formCount);
      console.log('Form details:', JSON.stringify(info.formDetails, null, 2));
      console.log('Captchas:', info.captchas);
      console.log('Contact links:', info.contactLinks);
    } catch (err) {
      console.error('Error visiting:', err.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspect().catch(console.error);
