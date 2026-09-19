import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,

I am reaching out to express our interest in your metal fabrication services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testWixGoDaddyBuilders(id, url, name) {
  console.log(`\n================== Testing Lead #${id}: ${name} ==================`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Listen to network responses
    page.on('response', async res => {
      const u = res.url();
      if (u.includes('contact') || u.includes('form') || u.includes('submit') || u.includes('lead') || u.includes('api')) {
        try {
          const status = res.status();
          console.log(`[NET] ${res.request().method()} ${u.slice(0, 100)} -> ${status}`);
        } catch(e) {}
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Find the form
    const formInfo = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return {
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, button')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          id: el.id,
          name: el.name,
          placeholder: el.placeholder,
          text: el.innerText
        }))
      };
    });

    console.log('Form structure:', JSON.stringify(formInfo, null, 2));

    // Fill inputs
    // Name input: look for input with label Name or id containing input
    const filled = await page.evaluate((profile) => {
      let nameInput = document.querySelector('input[name*="name" i]') ||
        Array.from(document.querySelectorAll('input[type="text"]')).find(el => {
          const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.innerText : el.closest('label')?.innerText;
          return /name/i.test(label || '') || /name/i.test(el.placeholder || '');
        });

      let emailInput = document.querySelector('input[type="email"], input[name*="email" i]') ||
        Array.from(document.querySelectorAll('input[type="text"]')).find(el => {
          const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.innerText : el.closest('label')?.innerText;
          return /email/i.test(label || '') || /email/i.test(el.placeholder || '');
        });

      let msgInput = document.querySelector('textarea');

      if (nameInput) nameInput.value = profile.fullName;
      if (emailInput) emailInput.value = profile.email;
      if (msgInput) msgInput.value = profile.message;

      // Dispatch input / change events
      [nameInput, emailInput, msgInput].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      return {
        hasName: !!nameInput,
        hasEmail: !!emailInput,
        hasMsg: !!msgInput,
        nameId: nameInput?.id,
        emailId: emailInput?.id
      };
    }, OUTREACH_PROFILE);

    console.log('Filled result:', filled);

    // Click submit button
    const submitBtnSelector = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('form button, form input[type="submit"], button[type="submit"]')).find(b => {
        const text = (b.innerText || b.value || '').toLowerCase();
        return /send|submit|contact|message|get in touch/i.test(text) || b.type === 'submit';
      });
      if (btn) {
        btn.id = btn.id || 'custom-submit-btn-' + Date.now();
        return '#' + btn.id;
      }
      return null;
    });

    console.log('Submit button selector:', submitBtnSelector);
    if (submitBtnSelector) {
      await page.click(submitBtnSelector);
      console.log('Clicked submit button, waiting 6 seconds...');
      await new Promise(r => setTimeout(r, 6000));

      // Check DOM for confirmation
      const postText = await page.evaluate(() => document.body.innerText);
      const isSuccess = /thank you|thanks for reaching out|message has been sent|we will get back to you|we have received your|submission received|sent successfully/i.test(postText);
      console.log('Is success confirmed?:', isSuccess);

      // Extract specific confirmation message
      const confirmationMsg = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('div, p, span, h2, h3, h4'));
        const matched = els.find(el => /thank you|message has been sent|thanks for reaching out|received your message/i.test(el.innerText) && el.innerText.length < 150);
        return matched ? matched.innerText.trim() : null;
      });

      console.log('Confirmation message element:', confirmationMsg);

      if (isSuccess || confirmationMsg) {
        console.log(`CONFIRMED SUCCESS FOR #${id}!`);
        const note = `Confirmed: Form submitted successfully (${confirmationMsg || 'Thank you message detected'})`;
        db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?')
          .run('contacted', ' | ' + note, id);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
          .run(id, 'sent', note);
      } else {
        console.log(`Could not find confirmation for #${id}`);
      }
    }

  } catch (e) {
    console.error(`Error on #${id}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testWixGoDaddyBuilders(4772, 'https://ascustomwelding.com/', "A's Custom Welding Fabrication");
  await testWixGoDaddyBuilders(4774, 'https://lafraguametalworks.com/', "La Fragua Metal Works LLC");
}

run();
