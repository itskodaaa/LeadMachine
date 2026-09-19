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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

const HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
};

async function test4681() {
  console.log('\n--- 4681 AZ Sheet Metal ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders(HEADERS);
    await page.goto('https://www.azsheetmetalllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input[placeholder="Full name"]', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input[placeholder="Email"]', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input[placeholder="Phone number"]', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('textarea[placeholder="Message"]', OUTREACH_PROFILE.message, { delay: 10 });

    // Click submit button by evaluating DOM
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const sub = btns.find(b => /submit/i.test(b.innerText || b.value));
      if (sub) {
        sub.click();
        return true;
      }
      return false;
    });
    console.log('4681 submit clicked?', clicked);

    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log('4681 Post submit snippet:', text.slice(0, 400).replace(/\n+/g, ' '));
    const confirmed = /thank you|received|sent|successfully|in touch|we will/i.test(text);
    console.log('4681 Confirmed?', confirmed);
  } catch (e) {
    console.log('4681 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function test4674() {
  console.log('\n--- 4674 AZ DC Electric ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders(HEADERS);
    await page.goto('https://azdcelectric.com', { waitUntil: 'networkidle2', timeout: 30000 });

    // Check contact links
    const contactLinks = await page.$$eval('a', as => as.map(a => ({ href: a.href, text: a.innerText.trim() })).filter(a => /contact|reach|quote/i.test(a.text) || /contact/i.test(a.href)));
    console.log('4674 Contact links:', contactLinks);

    // Check forms on page
    const forms = await page.$$eval('form', fs => fs.map(f => ({
      id: f.id,
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder }))
    })));
    console.log('4674 Forms:', JSON.stringify(forms, null, 2));

    // Check captcha
    const captcha = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]'),
        hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
        turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]')
      };
    });
    console.log('4674 Captcha:', captcha);

  } catch (e) {
    console.log('4674 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function test4677() {
  console.log('\n--- 4677 Unique Electrical Contractors ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders(HEADERS);
    const resp = await page.goto('https://uniqueelectrical.com', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('4677 Status:', resp.status());
    console.log('4677 Title:', await page.title());

    // Check forms on page
    const forms = await page.$$eval('form', fs => fs.map(f => ({
      id: f.id,
      action: f.action,
      inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder }))
    })));
    console.log('4677 Forms:', JSON.stringify(forms, null, 2));

    // Check contact links
    const contactLinks = await page.$$eval('a', as => as.map(a => ({ href: a.href, text: a.innerText.trim() })).filter(a => /contact|reach|quote/i.test(a.text) || /contact/i.test(a.href)));
    console.log('4677 Contact links:', contactLinks);

  } catch (e) {
    console.log('4677 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await test4681();
  await test4674();
  await test4677();
}

main().catch(console.error);
