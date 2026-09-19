import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testGoDaddyCarefully() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Sanrachna Steel
  console.log('\n--- 4391 Sanrachna Steel ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://sanrachnasteel.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });

    // Close cookie banner if present
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const accept = btns.find(b => /accept|ok|agree|got it/i.test(b.innerText));
      if (accept) accept.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill form by inspecting form structure
    const formFilled = await page.evaluate((profile) => {
      const form = document.querySelector('form');
      if (!form) return 'No form';
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea'));
      // Expecting: Name, Email, Phone, Message
      for (const inp of inputs) {
        if (inp.placeholder.toLowerCase().includes('name') || inp.getAttribute('aria-label')?.toLowerCase().includes('name') || inp.id.includes('4') || inp.type === 'text') {
          if (!inp.value) { inp.value = profile.fullName; inp.dispatchEvent(new Event('input', { bubbles: true })); continue; }
        }
        if (inp.type === 'email' || inp.placeholder.toLowerCase().includes('email') || inp.getAttribute('aria-label')?.toLowerCase().includes('email')) {
          inp.value = profile.email; inp.dispatchEvent(new Event('input', { bubbles: true })); continue;
        }
        if (inp.type === 'tel' || inp.placeholder.toLowerCase().includes('phone') || inp.getAttribute('aria-label')?.toLowerCase().includes('phone')) {
          inp.value = profile.phone; inp.dispatchEvent(new Event('input', { bubbles: true })); continue;
        }
        if (inp.tagName === 'TEXTAREA' || inp.placeholder.toLowerCase().includes('notes') || inp.placeholder.toLowerCase().includes('message')) {
          inp.value = profile.message; inp.dispatchEvent(new Event('input', { bubbles: true })); continue;
        }
      }
      return inputs.map(i => ({ id: i.id, val: i.value, placeholder: i.placeholder }));
    }, OUTREACH_PROFILE);
    console.log('Sanrachna inputs after filling:', formFilled);

    // Click submit
    await page.evaluate(() => {
      const form = document.querySelector('form');
      const submitBtn = form?.querySelector('button[type="submit"]') || Array.from(form?.querySelectorAll('button') || []).find(b => /send|submit/i.test(b.innerText));
      if (submitBtn) {
        submitBtn.scrollIntoView();
        submitBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      return {
        text: document.body.innerText.substring(0, 500),
        formExists: !!document.querySelector('form')
      };
    });
    console.log('Sanrachna post-submit:', result);
    await page.close();
  } catch (e) {
    console.log('Sanrachna error:', e.message);
  }

  // 2. Sykes Consulting
  console.log('\n--- 4392 Sykes Consulting ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://sykes-consulting.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });

    // Close cookie banner if present
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const accept = btns.find(b => /accept|ok|agree|got it/i.test(b.innerText));
      if (accept) accept.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill form by inspecting form structure
    const formFilled = await page.evaluate((profile) => {
      const form = document.querySelector('form');
      if (!form) return 'No form';
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea'));
      console.log('inputs count:', inputs.length);
      // Sykes usually has: Name, Email, Phone, Message
      if (inputs[0]) { inputs[0].value = profile.fullName; inputs[0].dispatchEvent(new Event('input', { bubbles: true })); }
      if (inputs[1]) { inputs[1].value = profile.email; inputs[1].dispatchEvent(new Event('input', { bubbles: true })); }
      if (inputs[2]) { inputs[2].value = profile.phone; inputs[2].dispatchEvent(new Event('input', { bubbles: true })); }
      if (inputs[3]) { inputs[3].value = profile.message; inputs[3].dispatchEvent(new Event('input', { bubbles: true })); }
      return inputs.map(i => ({ id: i.id, val: i.value, placeholder: i.placeholder }));
    }, OUTREACH_PROFILE);
    console.log('Sykes inputs after filling:', formFilled);

    // Click submit
    await page.evaluate(() => {
      const form = document.querySelector('form');
      const submitBtn = form?.querySelector('button[type="submit"]') || Array.from(form?.querySelectorAll('button') || []).find(b => /send|submit/i.test(b.innerText));
      if (submitBtn) {
        submitBtn.scrollIntoView();
        submitBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      return {
        text: document.body.innerText.substring(0, 500),
        formExists: !!document.querySelector('form')
      };
    });
    console.log('Sykes post-submit:', result);
    await page.close();
  } catch (e) {
    console.log('Sykes error:', e.message);
  }

  await browser.close();
}

testGoDaddyCarefully();
