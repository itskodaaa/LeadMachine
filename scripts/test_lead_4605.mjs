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

async function test4605() {
  console.log('\n--- Retrying #4605 Supreme Custom Metalwork ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('admin-ajax') || res.url().includes('frm')) {
      console.log(`  [Ajax] ${res.status()} ${res.url()}`);
      try {
        const t = await res.text();
        console.log(`  [Ajax Body] ${t.slice(0, 300)}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://supremecustommetalwork.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });

    // Inspect the Google Form iframe
    const frames = page.frames();
    console.log('Frames count:', frames.length);
    for (const f of frames) {
      console.log('Frame URL:', f.url());
    }

    // Inspect Formidable form
    const fHtml = await page.evaluate(() => {
      const f = document.querySelector('#form_contact-form');
      return f ? f.innerHTML : 'No form found';
    });
    console.log('Formidable HTML snippet:', fHtml.slice(0, 500));

    // Fill Formidable
    await page.type('#field_qh4icy', PROFILE.firstName, { delay: 10 });
    await page.type('#field_ocfup1', PROFILE.lastName, { delay: 10 });
    await page.type('#field_29yf4d', PROFILE.email, { delay: 10 });
    await page.type('#field_9jv0r1', PROFILE.message, { delay: 10 });

    const submitBtn = await page.$('#form_contact-form button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submit on #form_contact-form...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const res = await page.evaluate(() => {
        const msg = document.querySelector('.frm_message, .frm_error_style, [role="alert"]');
        return {
          msgText: msg?.innerText,
          bodyText: document.querySelector('#form_contact-form')?.innerText || document.body.innerText.slice(0, 400)
        };
      });
      console.log('Formidable response:', res);
    }

  } catch (e) {
    console.log('Error 4605:', e.message);
  } finally {
    await browser.close();
  }
}

test4605();
