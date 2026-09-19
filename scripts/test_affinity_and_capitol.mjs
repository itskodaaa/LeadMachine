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
  message: 'Hello, I am reaching out to express our interest in your precision machining and custom fabrication services. Please arrange for a representative to contact us regarding collaboration and upcoming project quotes. Thank you, Pamela Jameson.'
};

async function testAffinity() {
  console.log('\n--- Retrying #4608 Affinity Metalworks ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.affinitymetalworks.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    const fn = await page.$('input[aria-label="First name"]');
    const ln = await page.$('input[aria-label="Last name"]');
    const em = await page.$('input[aria-label="Email"]');
    const ph = await page.$('input[aria-label*="Phone"]');
    const msg = await page.$('textarea[aria-label*="Tell us"]');

    if (fn) { await fn.click(); await fn.type(PROFILE.firstName, { delay: 15 }); }
    if (ln) { await ln.click(); await ln.type(PROFILE.lastName, { delay: 15 }); }
    if (em) { await em.click(); await em.type(PROFILE.email, { delay: 15 }); }
    if (ph) { await ph.click(); await ph.type(PROFILE.phone, { delay: 15 }); }
    if (msg) { await msg.click(); await msg.type(PROFILE.message, { delay: 10 }); }

    // Click the button with text "Request a free quote"
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => (b.innerText || '').toLowerCase().includes('request a free quote'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Button clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      const successEls = Array.from(document.querySelectorAll('[data-testid="form-submitted"], .wixui-form__message, [role="alert"], [class*="success"]')).map(e => e.innerText);
      return {
        successEls,
        hasThank: text.toLowerCase().includes('thank') || text.toLowerCase().includes('received') || text.toLowerCase().includes('sent') || text.toLowerCase().includes('we will be in touch'),
        tail: text.slice(-500).replace(/\n+/g, ' ')
      };
    });
    console.log('Affinity Result:', result);
  } catch (e) {
    console.log('Error Affinity:', e.message);
  } finally {
    await browser.close();
  }
}

async function testCapitol() {
  console.log('\n--- Retrying #4606 Capitol Company ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('form') || res.url().includes('send') || res.url().includes('action')) {
      console.log(`  [Network Response] ${res.status()} ${res.url()}`);
      try {
        const text = await res.text();
        console.log(`  [Response Body] ${text.slice(0, 200)}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://www.capitolcompany.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.type('input[name="dmform-0"]', PROFILE.firstName, { delay: 15 });
    await page.type('input[name="dmform-4"]', PROFILE.lastName, { delay: 15 });
    await page.type('input[name="dmform-2"]', PROFILE.phone, { delay: 15 });
    await page.type('input[name="dmform-1"]', PROFILE.email, { delay: 15 });
    await page.type('textarea[name="dmform-3"]', PROFILE.message, { delay: 10 });

    const submitBtn = await page.$('input[type="submit"]');
    console.log('Submit button found:', !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const res = await page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('.dmformSuccess, .dmformError, [role="alert"], .alert')).map(e => e.innerText);
        return { msgs, bodySnippet: document.body.innerText.slice(0, 500).replace(/\n+/g, ' ') };
      });
      console.log('Capitol Result:', res);
    }
  } catch (e) {
    console.log('Error Capitol:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testAffinity();
  await testCapitol();
}

run();
