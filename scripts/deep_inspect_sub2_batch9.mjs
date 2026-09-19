import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const targets = [
  { id: 3718, name: 'Mec-Tric Control Co', url: 'https://mec-tric.com' },
  { id: 3723, name: 'Gianni Electrical Service', url: 'https://www.giannielectrical.net/contact' },
  { id: 3724, name: 'Fabrication Associates Inc', url: 'https://www.fai6.com/contact-us' },
  { id: 3726, name: 'KSV Group', url: 'https://ksvgroup.com/contact/' },
  { id: 3727, name: 'Carrington Engineering Sales', url: 'https://www.carringtoninc.com/' },
];

async function inspectTarget(browser, target) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n=== #${target.id} ${target.name} ===`);
  try {
    await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check for captcha
    const hasCaptcha = await page.evaluate(() => {
      const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return captchas.length > 0;
    });

    // Get all form details
    const formData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        method: f.method,
        inputCount: f.querySelectorAll('input, textarea, select').length,
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          className: el.className || ''
        })),
        submitBtns: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({
          tag: b.tagName,
          type: b.type || '',
          text: b.innerText || b.value || ''
        }))
      }));
    });

    console.log(`  Captcha: ${hasCaptcha}`);
    console.log(`  URL: ${page.url()}`);
    console.log(`  Forms found: ${formData.length}`);
    formData.forEach((f, i) => {
      console.log(`  Form[${i}] action=${f.action} method=${f.method} inputs=${f.inputCount}`);
      f.inputs.forEach(inp => console.log(`    input: tag=${inp.tag} type=${inp.type} name=${inp.name} id=${inp.id} placeholder=${inp.placeholder}`));
      f.submitBtns.forEach(b => console.log(`    submit: ${b.tag} type=${b.type} text="${b.text}"`));
    });

    // Try to find contact link if no form
    if (formData.length === 0) {
      const contactLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const kw = ['contact', 'get-in-touch', 'inquire', 'quote'];
        for (const k of kw) {
          const m = links.find(a => (a.innerText || '').toLowerCase().includes(k) || (a.href || '').toLowerCase().includes(k));
          if (m) return { text: m.innerText, href: m.href };
        }
        return null;
      });
      if (contactLink) console.log(`  Contact link found: "${contactLink.text}" => ${contactLink.href}`);
    }

    // Page title and key body text
    const title = await page.title();
    const bodySnippet = await page.evaluate(() => (document.body?.innerText || '').substring(0, 400));
    console.log(`  Title: ${title}`);
    console.log(`  Body snippet: ${bodySnippet.replace(/\n/g, ' ')}`);

  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const target of targets) {
    await inspectTarget(browser, target);
  }

  await browser.close();
  console.log('\n✅ Deep inspection complete.');
})();
