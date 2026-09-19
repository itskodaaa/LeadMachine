import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  message: 'Hello, I am reaching out to express our interest in your services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

function commitStatus(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB COMMIT] Lead #${id} -> status: ${status}, note: ${note}`);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Check H & M Unlimited (#2410)
  try {
    console.log('\n--- Checking Lead #2410 H & M Unlimited ---');
    const page = await browser.newPage();
    await page.goto('https://hmunlimitedinc.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const submitResult = await page.evaluate((profile) => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return { success: false, reason: 'No wpcf7 form found' };

      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const inp of inputs) {
        const ph = (inp.placeholder || '').toLowerCase();
        const nm = (inp.name || '').toLowerCase();
        if (ph.includes('name')) inp.value = profile.fullName;
        else if (ph.includes('service')) inp.value = 'Commercial Drywall & Painting';
        else if (ph.includes('email') || inp.type === 'email') inp.value = profile.email;
        else if (ph.includes('square')) inp.value = '5000';
        else if (ph.includes('phone') || inp.type === 'number' || nm.includes('number')) inp.value = profile.phone;
        else if (inp.type === 'date') inp.value = '2026-10-15';
        else if (inp.tagName === 'TEXTAREA') inp.value = profile.message;
      }

      // dispatch input and change events
      inputs.forEach(inp => {
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const btn = form.querySelector('.wpcf7-submit, input[type="submit"]');
      if (btn) {
        btn.click();
        return { success: true };
      }
      return { success: false, reason: 'No submit button' };
    }, OUTREACH);

    console.log('H & M submit evaluation:', submitResult);

    // Wait for CF7 response
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const resp = await page.evaluate(() => {
        const el = document.querySelector('.wpcf7-response-output');
        return el ? el.innerText.trim() : null;
      });
      if (resp) {
        console.log(`Sec ${i+1} CF7 output:`, resp);
        if (/thank you|received|sent|success/i.test(resp)) {
          commitStatus(2410, 'contacted', `Confirmed WP CF7: ${resp}`);
          break;
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('H & M error:', e.message);
  }

  // Check Terra (#2405)
  try {
    console.log('\n--- Checking Lead #2405 TERRA CONTRACTING ---');
    const page = await browser.newPage();
    // Try www or direct with longer timeout
    await page.goto('http://terracontracting.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Navigated to Terra. Page title:', await page.title());
    const formInfo = await page.evaluate(() => {
      const f = document.querySelector('#gform_1');
      return f ? { action: f.action, inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => i.id) } : null;
    });
    console.log('Terra form info:', formInfo);

    if (formInfo) {
      const f1 = await page.$('#input_1_1_3');
      if (f1) await f1.type('Pamela');
      const f2 = await page.$('#input_1_1_6');
      if (f2) await f2.type('Jameson');
      const f3 = await page.$('#input_1_2');
      if (f3) await f3.type('708-568-3708');
      const f4 = await page.$('#input_1_3');
      if (f4) await f4.type('pamela.jameson@nortiheastprecision.com');
      const f5 = await page.$('#input_1_4');
      if (f5) await f5.type('Hello, Northeast Precision Machinery would like to explore potential commercial contracting collaboration. Please contact us. Thank you.');

      console.log('Clicking Terra submit...');
      const submitBtn = await page.$('#gform_submit_button_1');
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('Nav wait:', e.message)),
          submitBtn.click()
        ]);
        await new Promise(r => setTimeout(r, 3000));
        const confText = await page.evaluate(() => document.body.innerText);
        console.log('Terra confirmation snippet:', confText.slice(0, 300));
        if (/thank you|received|sent|confirmation/i.test(confText)) {
          commitStatus(2405, 'contacted', 'Confirmed: Gravity Form submission on terracontracting.com');
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('Terra error:', e.message);
  }

  // Check Desert Valley Contracting (#2401)
  try {
    console.log('\n--- Checking Lead #2401 Desert Valley Contracting ---');
    const page = await browser.newPage();
    await page.goto('https://www.desertvalleycontracting.net/contact-las-vegas-contractor', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const recaptcha = await page.evaluate(() => {
      const frame = document.querySelector('iframe[src*="recaptcha"]');
      const gRecaptcha = document.querySelector('.g-recaptcha, #g-recaptcha-response');
      return { hasFrame: !!frame, hasInput: !!gRecaptcha };
    });
    console.log('Desert Valley reCAPTCHA info:', recaptcha);
    await page.close();
  } catch (e) {
    console.error('Desert Valley error:', e.message);
  }

  // Check Civil Werx (#2408)
  try {
    console.log('\n--- Checking Lead #2408 Civil Werx ---');
    const page = await browser.newPage();
    await page.goto('https://civilwerx.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const cwInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      const recaptcha = document.querySelector('iframe[src*="recaptcha"], .g-recaptcha');
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.outerHTML.slice(0, 200));
      return { textSnippet: text.slice(0, 300), hasRecaptcha: !!recaptcha, forms };
    });
    console.log('Civil Werx info:', cwInfo);
    await page.close();
  } catch (e) {
    console.error('Civil Werx error:', e.message);
  }

  // Check Yack Construction (#2403) and Gibson (#2409)
  try {
    console.log('\n--- Checking Lead #2403 Yack Construction ---');
    const page = await browser.newPage();
    await page.goto('https://yackconstruction.net', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const yackText = await page.evaluate(() => document.body.innerText);
    console.log('Yack text snippet:', yackText.slice(0, 300));
    await page.close();
  } catch (e) {
    console.error('Yack error:', e.message);
  }

  try {
    console.log('\n--- Checking Lead #2409 Gibson Construction ---');
    const page = await browser.newPage();
    await page.goto('https://gibsonconstruction.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const gibsonText = await page.evaluate(() => document.body.innerText);
    console.log('Gibson text snippet:', gibsonText.slice(0, 300));
    await page.close();
  } catch (e) {
    console.error('Gibson error:', e.message);
  }

  await browser.close();
}

run();
