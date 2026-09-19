import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const TARGETS = [
  { id: 5322, name: 'Alameda Electric LLC', url: 'https://www.alamedaelectricpdx.com/contact-1' },
  { id: 5323, name: 'Lear Electric Co., Inc.', url: 'https://www.learelectric.com/' },
  { id: 5326, name: 'Dynalectric Oregon', url: 'https://dyna-oregon.com/' },
  { id: 5333, name: 'Ziba Headquarters', url: 'https://www.ziba.com/' },
  { id: 5334, name: 'Simplexity Product Development', url: 'https://www.simplexitypd.com/' },
];

async function inspectSite(browser, target) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n===== #${target.id} ${target.name} =====`);
  console.log(`URL: ${target.url}`);

  try {
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect all forms
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, fi) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select, button'));
        return {
          formIndex: fi,
          action: f.action || f.getAttribute('action') || '(none)',
          method: f.method || f.getAttribute('method') || '(none)',
          id: f.id,
          className: f.className.substring(0, 80),
          fields: inputs.map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder || '',
            value: el.value || '',
            className: el.className.substring(0, 60),
          }))
        };
      });
    });

    console.log(`Found ${formInfo.length} form(s):`);
    formInfo.forEach(f => {
      console.log(`  Form #${f.formIndex}: id="${f.id}" class="${f.className}" action="${f.action}" method="${f.method}"`);
      f.fields.forEach(field => {
        console.log(`    [${field.tag}] type="${field.type}" name="${field.name}" id="${field.id}" placeholder="${field.placeholder}"`);
      });
    });

    // Check for captcha
    const captchaCheck = await page.evaluate(() => {
      const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return captchas.length > 0 ? Array.from(captchas).map(c => c.outerHTML.substring(0, 200)) : [];
    });
    if (captchaCheck.length > 0) {
      console.log(`  CAPTCHA FOUND: ${captchaCheck[0]}`);
    }

    // Check for contact link 
    const contactLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .filter(a => {
          const href = a.href || '';
          const text = (a.innerText || '').toLowerCase();
          return (text.includes('contact') || href.toLowerCase().includes('contact')) 
            && !href.startsWith('mailto:') && !href.startsWith('tel:');
        })
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .slice(0, 5);
    });
    if (contactLinks.length > 0) {
      console.log('  Contact links found:');
      contactLinks.forEach(l => console.log(`    "${l.text}" -> ${l.href}`));
    }

  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }

  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ignore-certificate-errors']
  });

  for (const target of TARGETS) {
    await inspectSite(browser, target);
  }

  await browser.close();
  console.log('\nDone.');
})();
