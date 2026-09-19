/**
 * Deep inspect for Subagent 5 Batch 18 (leads 5129-5132, 5135, 5138)
 * Investigates the forms that had no confirmation detected
 */
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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const targets = [
  { id: 5129, company: 'Advanced Tech Machining', url: 'https://www.atmachining.us/contact' },
  { id: 5130, company: 'AJ Solutions Machining', url: 'https://www.ajsolutionsmachining.com/' },
  { id: 5131, company: 'HD MACHINING LLC', url: 'https://hdmachinings.com/' },
  { id: 5132, company: 'J&R Machining', url: 'https://www.jrmachining.com/contact' },
  { id: 5135, company: 'Authentic Machining Inc', url: 'https://authenticmachining.com/' },
  { id: 5138, company: 'Alta Design & Manufacturing Inc', url: 'https://www.alta-eng.com/contact' },
];

async function inspectSite(browser, target) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  const networkRequests = [];
  page.on('request', req => {
    if (['fetch', 'xhr'].includes(req.resourceType())) {
      networkRequests.push({ method: req.method(), url: req.url().substring(0, 120) });
    }
  });

  console.log(`\n[${target.id}] === ${target.company} ===`);
  console.log(`    URL: ${target.url}`);

  try {
    await page.goto(target.url, { waitUntil: 'networkidle0', timeout: 15000 });
  } catch (e) {
    // try domcontentloaded fallback
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e2) {
      console.log(`    ERROR: ${e2.message}`);
      await page.close();
      return;
    }
  }

  const info = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    const formInfo = forms.map(f => ({
      action: f.action,
      method: f.method,
      inputCount: f.querySelectorAll('input, textarea, select').length,
      inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || ''
      })),
      captcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], [data-sitekey]'),
      captchaType: f.querySelector('.g-recaptcha') ? 'recaptcha' : 
                   f.querySelector('iframe[src*="hcaptcha"]') ? 'hcaptcha' : null
    }));

    // check for iframes
    const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({
      src: f.src,
      id: f.id
    }));

    return {
      title: document.title,
      formCount: forms.length,
      forms: formInfo,
      iframes: iframes.slice(0, 5),
      bodyText: document.body?.innerText?.substring(0, 500) || ''
    };
  });

  console.log(`    Title: ${info.title}`);
  console.log(`    Forms found: ${info.formCount}`);
  info.forms.forEach((f, i) => {
    console.log(`    Form[${i}]: action=${f.action}, method=${f.method}, inputs=${f.inputCount}, captcha=${f.captcha}(${f.captchaType})`);
    f.inputs.forEach(inp => console.log(`      - ${inp.tag}[${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"`));
  });
  if (info.iframes.length) {
    console.log(`    Iframes: ${info.iframes.map(f => f.src.substring(0, 80)).join(', ')}`);
  }
  
  await page.close();
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const t of targets) {
    await inspectSite(browser, t);
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();
  console.log('\nInspection complete.');
}

run().catch(console.error);
