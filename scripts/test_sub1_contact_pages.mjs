import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const contactPages = [
  { id: 4441, name: 'Jah Environmental', url: 'https://jesh.llc' },
  { id: 4442, name: 'Proficient Engineering', url: 'https://proficientengineering.com' },
  { id: 4443, name: 'Coweta Tech Precision', url: 'https://cowetatechprecision.com' },
  { id: 4444, name: 'DDM Systems', url: 'https://rapidprecisioncastings.com/contact-us/' },
  { id: 4445, name: 'PrototyperLab', url: 'https://prototyperlab.com/contact-us/' },
  { id: 4447, name: 'EMC Engineering', url: 'https://emc-eng.com' },
  { id: 4448, name: 'Doble Engineering', url: 'https://www.doble.com/contact/' },
  { id: 4451, name: 'Actemium Atlanta', url: 'https://www.actemium.us/contact/' },
  { id: 4453, name: 'B & R Industrial', url: 'https://www.br-automation.com/en/about-us/contact/' },
  { id: 4454, name: "McKenney's Inc", url: 'https://www.mckenneys.com/contact/' }
];

async function inspectContacts() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const item of contactPages) {
    const page = await browser.newPage();
    try {
      console.log(`\n========================================`);
      console.log(`[Lead #${item.id}] ${item.name} -> ${item.url}`);
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const title = await page.title();
      console.log(`Title: ${title} | Current URL: ${page.url()}`);

      // If landing page was given, look for contact url
      const subContactUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const cl = links.find(a => /contact|touch|reach/i.test(a.innerText.trim()) || /contact/i.test(a.href));
        return cl ? cl.href : null;
      });
      console.log(`Sub-contact link if any: ${subContactUrl}`);

      const info = await page.evaluate(() => {
        const text = document.body.innerText;
        const forms = Array.from(document.querySelectorAll('form'));
        const formData = forms.map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            name: el.name,
            type: el.type,
            placeholder: el.placeholder,
            id: el.id,
            required: el.required
          }));
          const btn = Array.from(f.querySelectorAll('button, input[type=submit]')).map(b => (b.innerText || b.value).trim());
          const captchas = Array.from(document.querySelectorAll('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare"]')).length;
          return { formIndex: i, action: f.action, method: f.method, inputs, btn, captchas };
        });

        // Also check iframes
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src).slice(0, 5);

        return {
          formsCount: forms.length,
          formData,
          iframes,
          hasCloudflare: text.includes('Cloudflare') || document.title.includes('Cloudflare') || text.includes('Attention Required'),
          emails: (text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || []).slice(0, 5)
        };
      });

      console.log(`Forms detected:`, JSON.stringify(info.formData, null, 2));
      console.log(`Iframes:`, info.iframes);
      console.log(`Emails found:`, info.emails);
      console.log(`Cloudflare block:`, info.hasCloudflare);

    } catch (e) {
      console.log(`Error on #${item.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspectContacts();
