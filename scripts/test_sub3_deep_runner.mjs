import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  // ==========================================
  // 1. TEST 4407 (Mann Mechanical)
  // ==========================================
  console.log('\n==========================================');
  console.log('--- Testing #4407 Mann Mechanical ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://mannmechanical.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    await page.type('#form-field-name', OUTREACH.fullName, { delay: 20 });
    await page.type('#form-field-field_b52b2e6', OUTREACH.phone, { delay: 20 });
    await page.type('#form-field-email', OUTREACH.email, { delay: 20 });
    await page.type('#form-field-message', OUTREACH.message, { delay: 10 });
    
    console.log('Submitting Mann Mechanical form...');
    await page.click('button[type="submit"]');
    await sleep(6000);
    
    const res4407 = await page.evaluate(() => {
      const elMsg = document.querySelector('.elementor-message');
      const body = document.body.innerText;
      return {
        elementorMsg: elMsg ? elMsg.innerText : null,
        bodyHasThanks: /thank you|thanks|message was sent|received/i.test(body),
        url: window.location.href
      };
    });
    console.log('Result 4407:', res4407);
    await page.close();
  } catch (e) {
    console.log('Error on 4407:', e.message);
  }

  // ==========================================
  // 2. TEST 4415 (Tech Technology Solutions)
  // ==========================================
  console.log('\n==========================================');
  console.log('--- Testing #4415 Tech Technology Solutions ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://techtechnologysolutions.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    await page.evaluate((p) => {
      const nameInput = document.getElementById('input3');
      const emailInput = document.getElementById('input4');
      const msgInput = document.querySelector('textarea');
      if (nameInput) {
        nameInput.value = p.fullName;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (emailInput) {
        emailInput.value = p.email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (msgInput) {
        msgInput.value = p.message;
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH);

    console.log('Submitting Tech Technology Solutions...');
    const sendBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      return buttons.find(b => (b.innerText || b.value || '').toLowerCase().includes('send'));
    });
    if (sendBtn) {
      await sendBtn.click();
      await sleep(6000);
      const res4415 = await page.evaluate(() => {
        const text = document.body.innerText;
        const alerts = Array.from(document.querySelectorAll('[role="alert"], .notification, [data-aid*="SUCCESS"], [class*="success"], [class*="confirmation"]')).map(a => a.innerText);
        return {
          alerts,
          hasThanks: /thank you|thanks|received|sent|successfully|in touch/i.test(text),
          url: window.location.href
        };
      });
      console.log('Result 4415:', res4415);
    }
    await page.close();
  } catch (e) {
    console.log('Error on 4415:', e.message);
  }

  // ==========================================
  // 3. TEST 4417 (Atkins Engineering Solutions)
  // ==========================================
  console.log('\n==========================================');
  console.log('--- Testing #4417 Atkins Engineering Solutions ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://atkengsol.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Step 1: Fill Name, Email, Company, Phone
    console.log('Filling Step 1 on 4417...');
    await page.type('#name', OUTREACH.fullName, { delay: 20 });
    await page.type('#email', OUTREACH.email, { delay: 20 });
    await page.type('#company', OUTREACH.company, { delay: 20 });
    await page.type('#phone', OUTREACH.phone, { delay: 20 });

    // Click Continue
    console.log('Clicking Continue on Step 1...');
    const continueBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.innerText.trim() === 'Continue');
    });
    if (continueBtn) {
      await continueBtn.click();
      await sleep(1500);

      // Inspect Step 2
      const step2Elements = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select, button'));
        return inputs.map(i => ({
          tag: i.tagName,
          type: i.type,
          id: i.id,
          name: i.name,
          placeholder: i.placeholder,
          text: i.innerText,
          visible: i.offsetWidth > 0 && i.offsetHeight > 0
        }));
      });
      console.log('Step 2 elements on 4417:', step2Elements);

      // Try filling Step 2
      await page.evaluate((p) => {
        const textareas = Array.from(document.querySelectorAll('textarea'));
        for (const t of textareas) {
          if (t.offsetWidth > 0 && t.offsetHeight > 0) {
            t.value = p.message;
            t.dispatchEvent(new Event('input', { bubbles: true }));
            t.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        // If there are checkboxes/radios or options
        const radios = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
        if (radios.length > 0 && !radios.some(r => r.checked)) {
          radios[0].click();
        }
      }, OUTREACH);

      // Look for next button (Continue or Submit)
      const nextBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => {
          const t = b.innerText.trim();
          return (t === 'Continue' || t === 'Submit' || t === 'Send' || t.includes('Request') || t.includes('Schedule')) && b.offsetWidth > 0;
        });
      });

      if (nextBtn) {
        console.log('Clicking Step 2 action button...');
        await nextBtn.click();
        await sleep(2000);

        // Check if there is Step 3 or confirmation
        const step3Elements = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select, button'));
          return inputs.map(i => ({
            tag: i.tagName,
            type: i.type,
            id: i.id,
            placeholder: i.placeholder,
            text: i.innerText,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }));
        });
        console.log('Step 3 / Post elements on 4417:', step3Elements);

        // Check for submit button if still on form
        const finalSubmit = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(b => {
            const t = b.innerText.trim();
            return (t.includes('Submit') || t.includes('Send') || t.includes('Request')) && b.offsetWidth > 0;
          });
        });

        if (finalSubmit) {
          console.log('Clicking Final Submit on 4417...');
          await finalSubmit.click();
          await sleep(5000);
        }

        const res4417 = await page.evaluate(() => {
          return {
            body: document.body.innerText.substring(0, 500).replace(/\n+/g, ' '),
            hasThanks: /thank you|thanks|received|request received|consultation scheduled|in touch/i.test(document.body.innerText)
          };
        });
        console.log('Result 4417:', res4417);
      }
    }
    await page.close();
  } catch (e) {
    console.log('Error on 4417:', e.message);
  }

  // ==========================================
  // 4. TEST 4408 (CHA Consulting)
  // ==========================================
  console.log('\n==========================================');
  console.log('--- Testing #4408 CHA Consulting ---');
  try {
    const page = await browser.newPage();
    // Try https://chasolutions.com with domcontentloaded
    console.log('Navigating to chasolutions.com...');
    await page.goto('https://chasolutions.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Reached CHA home. URL:', page.url());
    
    // Look for contact link
    const contactHref = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const c = links.find(a => (a.innerText || '').toLowerCase().includes('contact us') || a.href.includes('/contact/'));
      return c ? c.href : null;
    });
    console.log('Contact link on CHA:', contactHref);

    if (contactHref) {
      await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('Contact page URL:', page.url());
      const chaFormInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(f => ({
          id: f.id,
          name: f.name,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder
          }))
        }));
      });
      console.log('Forms on CHA contact page:', JSON.stringify(chaFormInfo, null, 2));
    }
    await page.close();
  } catch (e) {
    console.log('Error on 4408:', e.message);
  }

  // ==========================================
  // 5. TEST 4411 (Kickr Design)
  // ==========================================
  console.log('\n==========================================');
  console.log('--- Testing #4411 Kickr Design ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.kickrdesign.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);

    // Let's see what recaptcha iframe is loaded
    const rcFrame = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      const rc = iframes.find(f => f.src.includes('recaptcha'));
      return rc ? rc.src : null;
    });
    console.log('Recaptcha frame on 4411:', rcFrame);
    await page.close();
  } catch (e) {
    console.log('Error on 4411:', e.message);
  }

  await browser.close();
}

run();
