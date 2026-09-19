import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

export async function inspect(url) {
  console.log(`\n=================== Inspecting: ${url} ===================`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));
    console.log('Final URL:', page.url(), 'Status:', res ? res.status() : 'none');
    console.log('Title:', await page.title());

    const data = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map((f, i) => ({
        idx: i,
        id: f.id,
        className: f.className,
        action: f.action,
        method: f.method,
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim()),
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
          tag: inp.tagName,
          type: inp.type,
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          required: inp.required,
          visible: (inp.offsetWidth > 0 && inp.offsetHeight > 0),
          label: inp.closest('label')?.innerText || inp.previousElementSibling?.innerText || inp.closest('.form-group, .field, .gfield, .wpforms-field, div')?.querySelector('label')?.innerText
        }))
      }));

      const contactLinks = Array.from(document.querySelectorAll('a'))
        .filter(a => {
          const t = (a.innerText || '').toLowerCase();
          const h = (a.href || '').toLowerCase();
          return (t.includes('contact') || h.includes('contact')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
        })
        .map(a => ({ text: a.innerText.trim(), href: a.href }));

      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));

      return { forms, contactLinks: contactLinks.slice(0, 5), captchas, bodySnippet: document.body ? document.body.innerText.slice(0, 400) : '' };
    });

    console.log('Forms count:', data.forms.length);
    console.log('Forms:', JSON.stringify(data.forms, null, 2));
    console.log('Contact links:', data.contactLinks);
    console.log('Captchas:', data.captchas);
    return data;
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

const target = process.argv[2];
if (target) {
  inspect(target);
}
