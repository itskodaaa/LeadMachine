/**
 * Deep inspection script for Sub-Agent 5 Batch 11 unconfirmed leads
 * Investigates: #3752, #3755, #3756, #3757, #3759
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const TARGETS = [
  { id: 3752, company: 'Latham Walters Engineering', url: 'https://lwengineer.com/contact-us' },
  { id: 3755, company: 'InterGemm', url: 'https://intergemm.com/expert-machining-support' },
  { id: 3756, company: 'MachineTech Inc.', url: 'https://machinetechcnc.com/contact/' },
  { id: 3757, company: 'Chiron America', url: 'https://chiron-group.com/contact' },
  { id: 3759, company: 'AirBorn Manufacturing Inc.', url: 'https://airbornusa.com/contact' },
];

async function inspectPage(browser, target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });

  try {
    await page.goto(target.url, { waitUntil: 'networkidle0', timeout: 20000 });
  } catch (e) {
    try { await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch (_) {}
  }

  await new Promise(r => setTimeout(r, 2000));

  const info = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
    const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey], .h-captcha');
    
    let captchaInfo = null;
    if (captchas.length > 0) {
      const el = captchas[0];
      const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
      const cls = el.className || '';
      if (src.includes('recaptcha') || cls.includes('recaptcha') || el.hasAttribute('data-sitekey')) captchaInfo = 'Google reCAPTCHA';
      else if (src.includes('hcaptcha') || cls.includes('hcaptcha') || cls.includes('h-captcha')) captchaInfo = 'hCaptcha';
      else if (src.includes('turnstile') || cls.includes('turnstile')) captchaInfo = 'Cloudflare Turnstile';
      else captchaInfo = 'Unknown CAPTCHA';
    }

    return {
      url: window.location.href,
      title: document.title,
      formCount: forms.length,
      inputCount: inputs.length,
      captcha: captchaInfo,
      bodySnippet: (document.body?.innerText || '').substring(0, 500),
      inputDetails: inputs.slice(0, 10).map(el => ({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || '',
        visible: el.offsetWidth > 0 && el.offsetHeight > 0
      }))
    };
  });

  await page.close();
  return { ...target, ...info };
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const t of TARGETS) {
    console.log(`\n🔍 Inspecting #${t.id} ${t.company}: ${t.url}`);
    try {
      const info = await inspectPage(browser, t);
      console.log(`   URL: ${info.url}`);
      console.log(`   Title: ${info.title}`);
      console.log(`   Forms: ${info.formCount}, Inputs: ${info.inputCount}`);
      console.log(`   CAPTCHA: ${info.captcha || 'None'}`);
      console.log(`   Body snippet: "${info.bodySnippet.substring(0, 200)}"`);
      if (info.inputDetails.length > 0) {
        console.log(`   Fields:`);
        info.inputDetails.forEach(f => console.log(`     - ${f.tag}[${f.type}] name="${f.name}" id="${f.id}" placeholder="${f.placeholder}" visible=${f.visible}`));
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }

  await browser.close();
  console.log('\n✅ Deep inspection complete.');
}

run();
