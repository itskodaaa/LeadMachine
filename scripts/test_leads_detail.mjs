import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testLead(leadId, url) {
  console.log(`\n=================== Testing #${leadId}: ${url} ===================`);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_BIN,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    page.setDefaultTimeout(30000);

    // Listen to network responses
    page.on('response', resp => {
      const u = resp.url();
      if (u.includes('submit') || u.includes('contact') || u.includes('form') || u.includes('api') || u.includes('ajax') || u.includes('wpcf7') || u.includes('wix') || u.includes('duda')) {
        console.log(`[NET ${resp.status()}] ${u.slice(0, 100)}`);
      }
    });

    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('Page loaded. URL:', page.url());

    // Check forms
    const formInfo = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      return Array.from(forms).map(f => {
        const fields = Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          value: el.value,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          label: el.id ? document.querySelector(`label[for="${el.id}"]`)?.innerText : el.closest('label')?.innerText
        }));
        const buttons = Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => ({
          tag: b.tagName,
          type: b.type,
          text: b.innerText || b.value
        }));
        return { action: f.action, method: f.method, fields, buttons };
      });
    });

    console.log('Form details:', JSON.stringify(formInfo, null, 2));

    // Check if there are captchas
    const captchas = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(el => ({
        tag: el.tagName,
        src: el.getAttribute('src'),
        sitekey: el.getAttribute('data-sitekey'),
        class: el.className
      }));
    });
    console.log('Captchas found:', captchas);

  } catch (err) {
    console.log(`Error on #${leadId}:`, err.message);
  } finally {
    if (browser) await browser.close();
  }
}

async function run() {
  await testLead(4004, 'https://skyframe-eng.com/');
  await testLead(4000, 'https://floridabuildingengineering.com/');
  await testLead(4001, 'https://mepdesigngroupllc.com/contact-us');
  await testLead(4003, 'https://zephyrengineeringfl.com/index.php/contact-us/');
}

run();
