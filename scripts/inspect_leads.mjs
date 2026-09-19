import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const leadUrls = {
  4073: 'https://anceengineering.com',
  4074: 'https://onestopinventing.com',
  4075: 'https://getinc.org',
  4076: 'https://castilloeng.com',
  4077: 'https://jd-miami.com',
  4079: 'https://protek.engineering',
  4080: 'https://egscfl.com',
  4081: 'https://ethosengineering.square.site'
};

async function inspect(leadId, url) {
  console.log(`\n================ Inspecting Lead #${leadId}: ${url} ================`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('dialog', async d => {
    console.log(`[DIALOG] ${d.type()}: ${d.message()}`);
    await d.dismiss();
  });

  page.on('response', resp => {
    const u = resp.url();
    if (u.includes('admin-ajax') || u.includes('form') || u.includes('contact') || u.includes('submit') || u.includes('wp-json')) {
      console.log(`[HTTP ${resp.status()}] ${u.slice(0, 100)}`);
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
  } catch (e) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e2) {
      console.log('Nav error:', e2.message);
      await browser.close();
      return;
    }
  }

  // Look for contact link if not on contact page
  const forms = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      method: f.method,
      id: f.id,
      className: f.className,
      inputCount: f.querySelectorAll('input, textarea').length,
      html: f.outerHTML.slice(0, 300)
    }));
  });

  console.log(`Page URL: ${page.url()}, Title: ${await page.title()}`);
  console.log('Forms found:', forms);

  // If no forms, find contact links
  const contactLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ href: a.href, text: a.innerText.trim() }))
      .filter(a => /contact|inquir|quote|touch/i.test(a.text) || /contact|inquir|quote/i.test(a.href))
      .slice(0, 5);
  });
  console.log('Contact links:', contactLinks);

  // Check captchas
  const captchaInfo = await page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
    const recaptchas = document.querySelectorAll('.g-recaptcha, [data-sitekey]');
    return {
      iframes: iframes.filter(s => s.includes('recaptcha') || s.includes('hcaptcha') || s.includes('turnstile')),
      recaptchaCount: recaptchas.length
    };
  });
  console.log('Captcha info:', captchaInfo);

  await browser.close();
}

async function run() {
  for (const [id, url] of Object.entries(leadUrls)) {
    try {
      await inspect(id, url);
    } catch (e) {
      console.log(`Error on ${id}:`, e.message);
    }
  }
}

run();
