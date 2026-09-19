import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function inspectBatch5() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors'] });
  const targets = [
    { id: 1597, name: 'Soldy Manufacturing', url: 'https://soldy.com/contact/' },
    { id: 1598, name: 'Illinois Broaching', url: 'https://ilbroach.com/' },
    { id: 1600, name: 'Braner USA', url: 'http://braner.com/' },
    { id: 1603, name: 'Slidematic Products', url: 'https://slidematicproducts.com/contact-us/' },
    { id: 1605, name: 'A-Z Factory Supply', url: 'https://azsupply.com/contact/' },
    { id: 1606, name: 'Laystrom Manufacturing', url: 'http://laystrom.com/' },
    { id: 1607, name: 'DT Equipment', url: 'https://dteci.com/' },
    { id: 1608, name: 'Advance Printers', url: 'https://advanceprintersmachine.com/' },
    { id: 1609, name: 'Triangle Package', url: 'https://trianglepackage.com/contact/' }
  ];

  for (const t of targets) {
    const page = await browser.newPage();
    console.log(`\n==============================================`);
    console.log(`--- Inspecting #${t.id} ${t.name} (${t.url}) ---`);
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Final URL: ${page.url()} | Title: ${await page.title()}`);

      const data = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
            name: inp.name,
            type: inp.type,
            id: inp.id,
            placeholder: inp.placeholder
          }));
          return { formIdx: i, action: f.action, class: f.className, inputs };
        });
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote/i.test(a.text) || /contact|quote/i.test(a.href))
          .slice(0, 4);
        return { forms, captchas, links, bodyText: document.body ? document.body.innerText.slice(0, 300) : '' };
      });

      console.log(`Forms:`, JSON.stringify(data.forms, null, 2));
      console.log(`Captchas:`, data.captchas);
      console.log(`Links:`, data.links);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
}
inspectBatch5();
