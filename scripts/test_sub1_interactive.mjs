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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testForms() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Test 1: Dewitt Tool Company Inc (#4842)
  console.log('\n--- Testing Lead #4842: Dewitt Tool Company Inc ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.dewitt-tool.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Fill Squarespace form
    const fnameSel = '#name-yui_3_17_2_1_1553888888520_3744-fname-field';
    const lnameSel = '#name-yui_3_17_2_1_1553888888520_3744-lname-field';
    const emailSel = '#email-yui_3_17_2_1_1553888888520_3745-field';
    const msgSel = '#textarea-yui_3_17_2_1_1553888888520_3747-field';
    
    await page.waitForSelector(fnameSel, { timeout: 5000 });
    await page.type(fnameSel, OUTREACH_PROFILE.firstName);
    await page.type(lnameSel, OUTREACH_PROFILE.lastName);
    await page.type(emailSel, OUTREACH_PROFILE.email);
    await page.type(msgSel, OUTREACH_PROFILE.message);

    console.log('Dewitt Tool form filled. Submitting...');
    // Click submit button
    const submitBtn = await page.$('.form-button-wrapper input[type="submit"], input[type="submit"][value*="Send"], button[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        submitBtn.click(),
        new Promise(r => setTimeout(r, 5000))
      ]);

      const confirmation = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const msg = document.querySelector('.form-submission-text, .form-submission-html');
        return {
          submissionMsg: msg ? msg.innerText : null,
          hasThankYou: /thank you|thanks/i.test(bodyText)
        };
      });
      console.log('Dewitt confirmation:', confirmation);
    } else {
      console.log('Dewitt submit button not found');
    }
    await page.close();
  } catch (e) {
    console.log('Dewitt error:', e.message);
  }

  // Test 2: DI-EL Tool (#4846)
  console.log('\n--- Testing Lead #4846: DI-EL Tool & Manufacturing Inc. ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://dieltool.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Check recaptcha type
    const captchaInfo = await page.evaluate(() => {
      const v2Iframe = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
      const v3 = document.querySelector('script[src*="render="], .grecaptcha-badge');
      return {
        hasV2Anchor: !!v2Iframe,
        hasV3Badge: !!v3,
        iframes: Array.from(document.querySelectorAll('iframe')).map(i => i.src)
      };
    });
    console.log('DI-EL Captcha info:', captchaInfo);

    // If invisible or testable, let's see fields
    const fname = await page.$('#ff_1_names_first_name_');
    if (fname) {
      await page.type('#ff_1_names_first_name_', OUTREACH_PROFILE.firstName);
      await page.type('#ff_1_names_last_name_', OUTREACH_PROFILE.lastName);
      await page.type('#ff_1_email', OUTREACH_PROFILE.email);
      await page.type('#ff_1_subject', OUTREACH_PROFILE.subject);
      await page.type('#ff_1_message', OUTREACH_PROFILE.message);

      console.log('DI-EL form filled. Clicking submit to test response...');
      const submitBtn = await page.$('button.ff-btn-submit');
      if (submitBtn) {
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 4000));
        const resText = await page.evaluate(() => {
          const alertBox = document.querySelector('.ff-message-success, .ff-errors-in-stack, .fluentform-response');
          return alertBox ? alertBox.innerText : document.body.innerText.slice(0, 300);
        });
        console.log('DI-EL submit response:', resText);
      }
    }
    await page.close();
  } catch (e) {
    console.log('DI-EL error:', e.message);
  }

  // Test 3: Master Tool Co. (#4840)
  console.log('\n--- Testing Lead #4840: Master Tool Co. ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://mastertoolusa.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });
    const captchaInfo = await page.evaluate(() => {
      const v2Iframe = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
      const grecaptcha = !!document.querySelector('.g-recaptcha, .grecaptcha-badge');
      return {
        hasV2Anchor: !!v2Iframe,
        hasGrecaptcha: grecaptcha,
        captchaHtml: document.querySelector('.gfield--type-captcha, .g-recaptcha')?.outerHTML
      };
    });
    console.log('Master Tool Captcha info:', captchaInfo);
    await page.close();
  } catch (e) {
    console.log('Master Tool error:', e.message);
  }

  // Test 4: Royo Machinery (#4848)
  console.log('\n--- Testing Lead #4848: Royo Machinery USA, LLC ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://royomachinery.com/contacts/en', { waitUntil: 'networkidle2', timeout: 25000 });
    const captchaInfo = await page.evaluate(() => {
      const v2Iframe = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
      const gfield = document.querySelector('.g-recaptcha');
      return {
        hasV2Anchor: !!v2Iframe,
        sitekey: gfield?.getAttribute('data-sitekey'),
        captchaHtml: gfield?.outerHTML
      };
    });
    console.log('Royo Captcha info:', captchaInfo);
    await page.close();
  } catch (e) {
    console.log('Royo error:', e.message);
  }

  // Test 5: USA Tools (#4839)
  console.log('\n--- Testing Lead #4839: USA Tools ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://usatoolsinc.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact/i.test(a.text) || /contact/i.test(a.href));
    });
    console.log('USA Tools contact links:', links);
    await page.close();
  } catch (e) {
    console.log('USA Tools error:', e.message);
  }

  // Test 6: AAA Tool & Saw Services (#4850)
  console.log('\n--- Testing Lead #4850: AAA Tool & Saw Services ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.aaatool.net', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact/i.test(a.text) || /contact/i.test(a.href));
    });
    console.log('AAA Tool contact links:', contactLinks);
    if (contactLinks.length > 0) {
      await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 25000 });
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, id: i.id }))
        }));
      });
      console.log('AAA Tool contact page forms:', JSON.stringify(forms, null, 2));
    }
    await page.close();
  } catch (e) {
    console.log('AAA Tool error:', e.message);
  }

  await browser.close();
}

testForms().catch(console.error);
