import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testBatch5Specifics() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors'] });
  const targets = [
    { id: 1597, name: 'Soldy Manufacturing', url: 'https://www.soldy.com/contact-us' },
    { id: 1598, name: 'Illinois Broaching', url: 'https://www.ilbroach.com/contact-us/' },
    { id: 1603, name: 'Slidematic Products', url: 'https://www.slidematicproducts.com/' },
    { id: 1605, name: 'A-Z Factory Supply', url: 'https://www.azsupply.com/cms/contact-us' },
    { id: 1607, name: 'DT Equipment', url: 'https://dteci.com/equipment-inquiries' },
    { id: 1608, name: 'Advance Printers', url: 'https://advanceprintersmachine.com/contact' },
    { id: 1609, name: 'Triangle Package', url: 'https://www.trianglepackage.com/contact' }
  ];

  for (const t of targets) {
    const page = await browser.newPage();
    console.log(`\n==============================================`);
    console.log(`--- Checking #${t.id} ${t.name} (${t.url}) ---`);
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Final URL: ${page.url()} | Title: ${await page.title()}`);

      const data = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
            name: inp.name,
            type: inp.type,
            id: inp.id,
            placeholder: inp.placeholder,
            required: inp.required,
            label: inp.closest('label')?.innerText || inp.previousElementSibling?.innerText
          }));
          const btn = f.querySelector('button, input[type="submit"]');
          return { formIdx: i, action: f.action, class: f.className, btn: btn?.innerText || btn?.value, inputs };
        });
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));
        const hsForms = Array.from(document.querySelectorAll('.hs-form, iframe[src*="hubspot"], [data-portal-id]')).map(h => h.outerHTML.slice(0, 100));
        return { forms, captchas, hsForms, bodySnippet: document.body ? document.body.innerText.slice(0, 300) : '' };
      });

      console.log(`Forms:`, JSON.stringify(data.forms, null, 2));
      console.log(`Captchas:`, data.captchas);
      console.log(`HubSpot:`, data.hsForms);
      console.log(`Body snippet:`, data.bodySnippet);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
}
testBatch5Specifics();
