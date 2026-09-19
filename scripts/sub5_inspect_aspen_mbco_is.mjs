import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkAspen() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== Aspen EPC Deep Check ===');
    await page.goto('https://aspenepc.com/aspen-contact-us-info.html', { waitUntil: 'networkidle2' });
    
    // Look at contactForm DOM structure
    const formHtml = await page.evaluate(() => {
      const f = document.querySelector('#contactForm');
      return f ? f.outerHTML : 'No #contactForm';
    });
    console.log('Aspen #contactForm HTML snippet:\n', formHtml.slice(0, 800));
  } catch(e) {
    console.log('Error Aspen:', e.message);
  } finally {
    await browser.close();
  }
}

async function checkMbco() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== MBCO Engineering Deep Check ===');
    await page.goto('https://mbcoengineering.com/', { waitUntil: 'networkidle2' });
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() })).filter(a => /contact/i.test(a.href) || /contact/i.test(a.text));
    });
    console.log('MBCO contact links:', contactLinks);
    const targetUrl = contactLinks.length > 0 ? contactLinks[0].href : 'https://mbcoengineering.com/';
    if (targetUrl !== page.url()) {
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    }
    const captcha = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]'),
        recaptchaSrc: document.querySelector('iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')?.src || null,
        form: !!document.querySelector('form')
      };
    });
    console.log('MBCO captcha details:', captcha);
  } catch(e) {
    console.log('Error MBCO:', e.message);
  } finally {
    await browser.close();
  }
}

async function checkIsEngineers() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('\n=== I. S. Engineers Deep Check ===');
    await page.goto('https://is-engineers.com/', { waitUntil: 'networkidle2' });
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() })).filter(a => /contact/i.test(a.href) || /contact/i.test(a.text));
    });
    console.log('IS Engineers contact links:', contactLinks);
    const targetUrl = contactLinks.length > 0 ? contactLinks[0].href : 'https://is-engineers.com/';
    if (targetUrl !== page.url()) {
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    }
    const captcha = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]'),
        recaptchaSrc: document.querySelector('iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')?.src || null,
        form: !!document.querySelector('form')
      };
    });
    console.log('IS Engineers captcha details:', captcha);
  } catch(e) {
    console.log('Error IS Engineers:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await checkAspen();
  await checkMbco();
  await checkIsEngineers();
}
run();
