import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const leadsToInvestigate = [
  { id: 3569, url: 'https://cortecprecision.com/Contact.html' },
  { id: 3573, url: 'https://www.fuson-cncmachining.com/contact/' },
  { id: 3575, url: 'https://sentinelmachining.com/' },
  { id: 3577, url: 'https://texascncinnovations.com/contact/' },
  { id: 3578, url: 'https://www.renewmfgsol.com/locations/renew-texas' }
];

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function inspectLeads() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of leadsToInvestigate) {
    console.log(`\n=== Checking #${item.id} ${item.url} ===`);
    const page = await browser.newPage();
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 25000 });
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          })),
          buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
        }));
      });
      console.log('Forms found:', JSON.stringify(forms, null, 2));

      // check if any iframe or recaptcha
      const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      });
      console.log('Iframes:', iframes.filter(src => src.includes('captcha') || src.includes('google') || src.includes('turnstile') || src.includes('hcaptcha')));
    } catch (e) {
      console.log('Error:', e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectLeads();
