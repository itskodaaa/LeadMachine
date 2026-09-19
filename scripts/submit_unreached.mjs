import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your civil and geotechnical engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention!'
};

function recordSuccess(id, note) {
  db.prepare("UPDATE leads SET notes = 'Confirmed: ' || ?, status = 'contacted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(note, id);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)").run(id, note);
  console.log(`[LEAD #${id}] SUCCESS: ${note}`);
}

async function submitTexTerra() {
  console.log('\n--- Submitting 3409 TexTerra Engineering ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://texterra-eng.com/?page_id=110', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('input[name="your-name"]', OUTREACH.fullName);
    await page.type('input[name="your-email"]', OUTREACH.email);
    await page.type('input[name="your-subject"]', OUTREACH.subject);
    await page.type('textarea[name="your-message"]', OUTREACH.message);

    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
    console.log('Submitting TexTerra...');
    await Promise.all([
      page.waitForResponse(res => res.url().includes('wp-json/contact-form-7') || res.url().includes('texterra-eng.com'), { timeout: 15000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 5000));

    const responseInfo = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      return {
        responseText: output ? output.innerText : '',
        statusClass: output ? output.className : '',
        bodyText: document.body.innerText
      };
    });

    console.log('TexTerra CF7 response:', responseInfo.responseText, responseInfo.statusClass);
    if (/thank you|your message has been sent|sent successfully/i.test(responseInfo.responseText) || !/error|failed/i.test(responseInfo.statusClass) && responseInfo.responseText) {
      recordSuccess(3409, `Contact Form 7 submitted: ${responseInfo.responseText}`);
    } else {
      console.log('CF7 status not explicit success:', responseInfo);
    }
  } catch (e) {
    console.error('TexTerra error:', e.message);
  } finally {
    await browser.close();
  }
}

async function submitPerceptive() {
  console.log('\n--- Submitting 3415 Perceptive Engineering ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox', '--window-size=1280,1000'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.perceptiveeng.com/connect-with-us', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill Wix inputs
    await page.type('#input_comp-k4sy0pq4', OUTREACH.firstName);
    await page.type('#input_comp-k4sy0psm', OUTREACH.lastName);
    await page.type('#input_comp-k4sy0pvl', OUTREACH.email);
    await page.type('#input_comp-k4t2dlbk', OUTREACH.phone);

    // Check first service checkbox if exists
    const cb = await page.$('input[type="checkbox"]');
    if (cb) await cb.click();

    await page.type('#textarea_comp-k4sy0q5g', OUTREACH.message);

    // Find submit button in form
    const submitBtn = await page.$('button[data-testid="buttonElement"], button[type="submit"], div[role="button"][aria-label*="Submit" i], button.submit');
    console.log('Clicking Perceptive submit button...');
    if (submitBtn) {
      await submitBtn.scrollIntoView();
      await new Promise(r => setTimeout(r, 500));
      await submitBtn.click();
    } else {
      // Find by text
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => b.innerText.trim().toLowerCase() === 'submit');
        if (btn) btn.click();
      });
    }

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('[data-testid="success-message"], .success-message, [aria-label*="success" i]');
      return {
        successText: successEl ? successEl.innerText : '',
        bodySnippet: document.body.innerText.slice(0, 1000)
      };
    });

    console.log('Perceptive result:', result.successText);
    if (/thank you|thanks for submitting|received your message|we will get back/i.test(result.successText) || /thanks for submitting/i.test(result.bodySnippet)) {
      recordSuccess(3415, `Wix form submitted: ${result.successText || 'Thanks for submitting'}`);
    } else {
      console.log('Checking for any notification messages:', result.bodySnippet);
      if (/thanks/i.test(result.bodySnippet)) {
        recordSuccess(3415, 'Wix form submitted successfully');
      }
    }
  } catch (e) {
    console.error('Perceptive error:', e.message);
  } finally {
    await browser.close();
  }
}

async function submitMD() {
  console.log('\n--- Submitting 3416 M&D General Contracting ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox', '--window-size=1280,1000'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.mdgcgroup.com/get-a-bid', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    // Evaluate and fill the form fields
    const filled = await page.evaluate((profile) => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], textarea'));
      let count = 0;
      for (const input of inputs) {
        const label = (input.getAttribute('aria-label') || input.placeholder || input.id || '').toLowerCase();
        const parentText = (input.closest('div') ? input.closest('div').innerText : '').toLowerCase();
        
        if (parentText.includes('first name') || label.includes('first')) {
          input.value = profile.firstName;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          count++;
        } else if (parentText.includes('last name') || label.includes('last')) {
          input.value = profile.lastName;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          count++;
        } else if (parentText.includes('email') || label.includes('email') || input.type === 'email') {
          input.value = profile.email;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          count++;
        } else if (parentText.includes('phone') || label.includes('phone') || input.type === 'tel') {
          input.value = profile.phone;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          count++;
        } else if (parentText.includes('project') || parentText.includes('tell us') || input.tagName === 'TEXTAREA') {
          input.value = profile.message;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          count++;
        } else if (parentText.includes('soon') || parentText.includes('timeline')) {
          input.value = 'Within 1-3 months';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          count++;
        }
      }
      return count;
    }, OUTREACH);

    console.log(`Filled ${filled} fields on MDGC`);

    // Click submit
    const submitBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => b.innerText.trim().toLowerCase() === 'submit');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    console.log('Clicked submit button:', submitBtn);
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('[data-testid="success-message"], .success-message, [aria-label*="success" i]');
      return {
        successText: successEl ? successEl.innerText : '',
        bodySnippet: document.body.innerText.slice(0, 1000)
      };
    });

    console.log('MDGC result:', result.successText);
    if (/thank you|thanks for submitting|received your message|we will get back/i.test(result.successText) || /thanks for submitting/i.test(result.bodySnippet)) {
      recordSuccess(3416, `Wix bid request submitted: ${result.successText || 'Thanks for submitting'}`);
    } else {
      console.log('MDGC body snippet:', result.bodySnippet);
    }
  } catch (e) {
    console.error('MDGC error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await submitTexTerra();
  await submitPerceptive();
  await submitMD();
}

main();
