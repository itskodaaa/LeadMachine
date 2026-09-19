import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import https from 'https';
import http from 'http';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkNetwork(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      resolve({ status: res.statusCode, headers: res.headers, location: res.headers.location });
    });
    req.on('error', err => resolve({ error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'Timeout' }); });
  });
}

async function runTests() {
  console.log('--- Network checks for 4254 & 4256 ---');
  console.log('4254 http:', await checkNetwork('http://houstonprecision.com'));
  console.log('4254 https:', await checkNetwork('https://houstonprecision.com'));
  console.log('4256 http:', await checkNetwork('http://pc-houston.com'));
  console.log('4256 https:', await checkNetwork('https://pc-houston.com'));

  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  // Test 4247: https://tyallc.com/get-in-touch/
  console.log('\n--- 4247: https://tyallc.com/get-in-touch/ ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://tyallc.com/get-in-touch/', { waitUntil: 'networkidle2', timeout: 15000 });
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
        hasTurnstile: !!f.querySelector('.cf-turnstile, [data-sitekey*="turnstile"], iframe[src*="turnstile"]'),
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder }))
      }));
    });
    console.log('4247 forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch(e) { console.log('4247 err:', e.message); }

  // Test 4248: https://westwoodps.com/contact-us
  console.log('\n--- 4248: https://westwoodps.com/contact-us ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://westwoodps.com/contact-us', { waitUntil: 'networkidle2', timeout: 15000 });
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
        hasTurnstile: !!f.querySelector('.cf-turnstile, [data-sitekey*="turnstile"], iframe[src*="turnstile"]'),
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder }))
      }));
    });
    console.log('4248 forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch(e) { console.log('4248 err:', e.message); }

  // Test 4249: https://ncprecisiontech.com/contact-nc-precision
  console.log('\n--- 4249: https://ncprecisiontech.com/contact-nc-precision ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://ncprecisiontech.com/contact-nc-precision', { waitUntil: 'networkidle2', timeout: 15000 });
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
        hasTurnstile: !!f.querySelector('.cf-turnstile, [data-sitekey*="turnstile"], iframe[src*="turnstile"]'),
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder }))
      }));
    });
    console.log('4249 forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch(e) { console.log('4249 err:', e.message); }

  // Test 4251: http://industrialprecisionmfg.com/industrial-precision-mfg-contact-us/
  console.log('\n--- 4251: http://industrialprecisionmfg.com/industrial-precision-mfg-contact-us/ ---');
  try {
    const page = await browser.newPage();
    await page.goto('http://industrialprecisionmfg.com/industrial-precision-mfg-contact-us/', { waitUntil: 'networkidle2', timeout: 15000 });
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
        hasTurnstile: !!f.querySelector('.cf-turnstile, [data-sitekey*="turnstile"], iframe[src*="turnstile"]'),
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder }))
      }));
    });
    console.log('4251 forms:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch(e) { console.log('4251 err:', e.message); }

  // Test 4252: https://breprecision.com
  console.log('\n--- 4252: https://breprecision.com ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://breprecision.com', { waitUntil: 'networkidle2', timeout: 15000 });
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
    });
    console.log('4252 all links with contact/quote/mail/tel:', contactLinks.filter(l => /contact|quote|mail|tel/i.test(l.text) || /mailto:|tel:/i.test(l.href)));
    await page.close();
  } catch(e) { console.log('4252 err:', e.message); }

  // Test 4255: https://esmdynamics.com/request-quote/
  console.log('\n--- 4255: https://esmdynamics.com/request-quote/ ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://esmdynamics.com/request-quote/', { waitUntil: 'networkidle2', timeout: 15000 });
    const iframes = await page.evaluate(() => Array.from(document.querySelectorAll('iframe')).map(i => i.src));
    console.log('4255 iframes:', iframes);
    const quoteText = await page.evaluate(() => document.querySelector('.entry-content, main, article, body')?.innerText || '');
    console.log('4255 page content snippet:', quoteText.slice(0, 300));
    await page.close();
  } catch(e) { console.log('4255 err:', e.message); }

  await browser.close();
}

runTests();
