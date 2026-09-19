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

async function testGoDaddySite(id, url, name) {
  console.log(`\n================== Testing Lead #${id}: ${name} ==================`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    page.on('response', async res => {
      const u = res.url();
      if (u.includes('email') || u.includes('contact') || u.includes('messages') || u.includes('form') || u.includes('leads')) {
        console.log(`[NET RESPONSE] ${res.status()} ${u.slice(0, 120)}`);
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Scroll down to the form
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Find the input selectors
    const selectors = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      
      const inputs = Array.from(form.querySelectorAll('input[type="text"], input:not([type])'));
      // Find name input
      const nameInput = inputs.find(i => {
        const lbl = i.id ? document.querySelector(`label[for="${i.id}"]`)?.innerText : i.closest('label')?.innerText;
        return /name/i.test(lbl || '') || /name/i.test(i.placeholder || '');
      }) || inputs[0];

      // Find email input
      const emailInput = inputs.find(i => {
        const lbl = i.id ? document.querySelector(`label[for="${i.id}"]`)?.innerText : i.closest('label')?.innerText;
        return /email/i.test(lbl || '') || /email/i.test(i.placeholder || '');
      }) || inputs[1];

      const textarea = form.querySelector('textarea');
      const submitBtn = form.querySelector('button[type="submit"], button');

      return {
        nameSelector: nameInput ? (nameInput.id ? '#' + nameInput.id : null) : null,
        emailSelector: emailInput ? (emailInput.id ? '#' + emailInput.id : null) : null,
        hasTextarea: !!textarea,
        submitText: submitBtn?.innerText
      };
    });

    console.log('Detected selectors:', selectors);

    if (selectors.nameSelector) {
      await page.click(selectors.nameSelector);
      await page.type(selectors.nameSelector, OUTREACH_PROFILE.fullName, { delay: 30 });
    }

    if (selectors.emailSelector) {
      await page.click(selectors.emailSelector);
      await page.type(selectors.emailSelector, OUTREACH_PROFILE.email, { delay: 30 });
    }

    if (selectors.hasTextarea) {
      await page.click('form textarea');
      await page.type('form textarea', OUTREACH_PROFILE.message, { delay: 10 });
    }

    await new Promise(r => setTimeout(r, 1000));

    // Click submit button in evaluate
    console.log('Clicking submit button...');
    const clicked = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return false;
      const btn = form.querySelector('button[type="submit"], button');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    console.log('Submit clicked:', clicked);
    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      const body = document.body.innerText;
      // Look for thank you / success alerts
      const successMsg = Array.from(document.querySelectorAll('div, p, span, h2, h3, h4'))
        .map(el => el.innerText.trim())
        .find(txt => /thank you|we'll be in touch|message sent|thanks for reaching out|inquiry received/i.test(txt) && txt.length < 150);
      
      const formStillVisible = !!document.querySelector('form input[type="text"]');
      return { successMsg, snippet: body.slice(0, 400), formStillVisible };
    });

    console.log('Submission result:', result);

    if (result.successMsg) {
      console.log(`SUCCESS CONFIRMED FOR #${id}: ${result.successMsg}`);
      const note = `Confirmed: Form submitted successfully (${result.successMsg})`;
      db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?')
        .run('contacted', ' | ' + note, id);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run(id, 'sent', note);
    }

  } catch (e) {
    console.error(`Error on #${id}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testGoDaddySite(4772, 'https://ascustomwelding.com/', "A's Custom Welding Fabrication");
  await testGoDaddySite(4774, 'https://lafraguametalworks.com/', "La Fragua Metal Works LLC");
}

run();
