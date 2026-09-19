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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you,
Pamela Jameson`
};

async function test3301and3305() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  // Test #3301 Industrial Electric: https://industrialelectricinc.com/contact-us-bid-request/
  console.log('\n--- Checking #3301 https://industrialelectricinc.com/contact-us-bid-request/ ---');
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });
    await page.goto('https://industrialelectricinc.com/contact-us-bid-request/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const fInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type,
          placeholder: i.placeholder,
          classes: i.className
        })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value),
        captcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], [data-sitekey]')
      }));
      return { title: document.title, forms };
    });
    console.log('3301 form info:', JSON.stringify(fInfo, null, 2));

    // If form exists and has inputs, let's fill and submit
    if (fInfo.forms.length > 0 && fInfo.forms[0].inputs.length > 2 && !fInfo.forms[0].captcha) {
      console.log('Attempting autofill on #3301...');
      // Fill all fields
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
        for (const el of inputs) {
          const name = (el.name || el.id || el.placeholder || '').toLowerCase();
          if (name.includes('name')) el.value = p.fullName;
          else if (name.includes('email')) el.value = p.email;
          else if (name.includes('phone') || name.includes('tel')) el.value = p.phone;
          else if (name.includes('company')) el.value = p.company;
          else if (el.tagName.toLowerCase() === 'textarea' || name.includes('message') || name.includes('comment')) el.value = p.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, OUTREACH_PROFILE);

      console.log('Clicking submit on #3301...');
      await page.evaluate(() => {
        const btn = document.querySelector('input[type="submit"], button[type="submit"]');
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 5000));
      const postSubmit3301 = await page.evaluate(() => ({
        url: window.location.href,
        text: document.body.innerText.slice(0, 600),
        alerts: Array.from(document.querySelectorAll('.wpcf7-response-output, .gform_confirmation_message, [role="alert"]')).map(e => e.innerText)
      }));
      console.log('3301 post-submit:', JSON.stringify(postSubmit3301, null, 2));
    }
    await page.close();
  } catch (e) { console.log('3301 error:', e.message); }

  // Test #3305 submit with reCAPTCHA v3
  console.log('\n--- Testing #3305 IDS Power ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://idspower.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });
    await page.type('#input_7_15_3', OUTREACH_PROFILE.firstName);
    await page.type('#input_7_15_6', OUTREACH_PROFILE.lastName);
    await page.type('#input_7_16', OUTREACH_PROFILE.email);
    await page.type('#input_7_17', OUTREACH_PROFILE.phone);
    await page.type('#input_7_19', OUTREACH_PROFILE.company);
    await page.select('#input_7_18', 'Other');
    await page.type('#input_7_7', OUTREACH_PROFILE.message);

    console.log('Submitting #3305...');
    await page.click('#gform_submit_button_7');
    await new Promise(r => setTimeout(r, 6000));

    const postSubmit3305 = await page.evaluate(() => ({
      url: window.location.href,
      conf: document.querySelector('.gform_confirmation_message')?.innerText,
      valError: document.querySelector('.gform_validation_errors, .validation_error')?.innerText
    }));
    console.log('3305 post-submit:', JSON.stringify(postSubmit3305, null, 2));
    await page.close();
  } catch (e) { console.log('3305 error:', e.message); }

  await browser.close();
}

test3301and3305();
