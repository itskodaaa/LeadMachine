import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspect() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const targets = [
    { id: 3939, name: 'BobCAD-CAM', url: 'https://bobcad.com' },
    { id: 3944, name: 'Aluces Corporation', url: 'https://alucescorp.com' },
    { id: 3946, name: 'FormTech Land Surveying Inc.', url: 'https://formtechco.com' },
    { id: 3947, name: 'Globe Engineering', url: 'https://civil-engineer.us' },
    { id: 3948, name: 'Civil Design Engineering, LLC', url: 'https://civildeng.com' },
    { id: 3949, name: 'CONNECT Engineering', url: 'https://connecteng.us' },
    { id: 3950, name: 'Seawater Construction Corp.', url: 'https://seawaterconstruction.com' },
    { id: 3951, name: 'GRAEF', url: 'https://graef-usa.com' }
  ];

  for (const t of targets) {
    console.log(`\n=================== Inspecting #${t.id} ${t.name} (${t.url}) ===================`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(25000);
    try {
      const resp = await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
        return page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(err => ({ error: err.message }));
      });
      console.log('Status / URL:', page.url());

      // Look for contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|quote|touch|about/i.test(a.text) || /contact|reach|quote/i.test(a.href))
          .slice(0, 10);
      });
      console.log('Contact links:', links);

      // Check current page forms
      const formsInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, i) => ({
          index: i,
          action: f.action,
          method: f.method,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')
        }));
      });
      console.log('Forms on main page:', JSON.stringify(formsInfo, null, 2));

    } catch (err) {
      console.log('Inspect error:', err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
