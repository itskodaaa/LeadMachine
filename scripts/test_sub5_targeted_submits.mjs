import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Sincerely, Pamela Jameson'
};

async function submitTargets() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. Check CAM (#4216)
  console.log('\n--- Processing #4216 CAM Integrated Solutions ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.camintegrated.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill Wix form
    const nameInput = await page.$('input[placeholder*="Name" i], #input_comp-k66juqeu');
    const emailInput = await page.$('input[placeholder*="Email" i], #input_comp-k66juqfq');
    const subjectInput = await page.$('input[placeholder*="Subject" i], #input_comp-k66juqgk');
    const msgInput = await page.$('textarea[placeholder*="Message" i], #textarea_comp-k66juqhm');
    const submitBtn = await page.$('button[type="submit"], form#comp-k66juqee1 button');

    if (nameInput && emailInput && msgInput && submitBtn) {
      await nameInput.type(PROFILE.fullName, { delay: 20 });
      await emailInput.type(PROFILE.email, { delay: 20 });
      if (subjectInput) await subjectInput.type(PROFILE.subject, { delay: 20 });
      await msgInput.type(PROFILE.message, { delay: 10 });
      
      console.log('CAM: Filled inputs, clicking submit...');
      await Promise.all([
        submitBtn.click(),
        new Promise(r => setTimeout(r, 6000))
      ]);

      const bodyText = await page.evaluate(() => document.body.innerText);
      const isConfirmed = /thank you|thanks for|message has been sent|received your/i.test(bodyText);
      console.log('CAM Result:', isConfirmed ? 'CONFIRMED' : 'Unconfirmed');
      console.log('CAM Page snippet:', bodyText.substring(0, 300).replace(/\n+/g, ' '));
      
      if (isConfirmed) {
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('contacted', 'Confirmed: Submitted via contact form on camintegrated.com/contact', 4216);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
          .run(4216, 'sent', 'Confirmed: Submitted via contact form on camintegrated.com/contact');
      }
    }
    await page.close();
  } catch (e) {
    console.log('CAM Error:', e.message);
  }

  // 2. Check MANA ENGINEERING (#4219)
  console.log('\n--- Processing #4219 MANA ENGINEERING ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://mana-ce.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const nameInput = await page.$('#fname, input[name="fname"]');
    const emailInput = await page.$('#email, input[name="email"]');
    const subjectInput = await page.$('#subject, input[name="subject"]');
    const msgInput = await page.$('#message, textarea[name="message"]');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');

    if (nameInput && emailInput && msgInput && submitBtn) {
      await nameInput.type(PROFILE.fullName, { delay: 20 });
      await emailInput.type(PROFILE.email, { delay: 20 });
      if (subjectInput) await subjectInput.type(PROFILE.subject, { delay: 20 });
      await msgInput.type(PROFILE.message, { delay: 10 });

      console.log('MANA: Filled inputs, submitting...');
      await Promise.all([
        submitBtn.click(),
        new Promise(r => setTimeout(r, 5000))
      ]);

      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('MANA URL:', page.url());
      console.log('MANA snippet:', bodyText.substring(0, 300).replace(/\n+/g, ' '));
      const isConfirmed = /thank you|thanks for|message has been sent|success|sent|received/i.test(bodyText) || page.url().includes('success') || page.url().includes('thank');
      
      if (isConfirmed) {
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('contacted', 'Confirmed: Submitted via contact form on mana-ce.com/contact.html', 4219);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
          .run(4219, 'sent', 'Confirmed: Submitted via contact form on mana-ce.com/contact.html');
      }
    }
    await page.close();
  } catch (e) {
    console.log('MANA Error:', e.message);
  }

  // 3. Check CS Mechanical (#4221)
  console.log('\n--- Processing #4221 CS Mechanical ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.csmechanical.co/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check form fields
    const fData = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('#form_contact-us input, #form_contact-us textarea, #form_contact-us select'));
      return inputs.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        label: i.labels?.[0]?.innerText || document.querySelector(`label[for="${i.id}"]`)?.innerText || ''
      }));
    });
    console.log('CS Mechanical fields:', fData);

    // Let's populate by labels or field IDs:
    for (const f of fData) {
      const lbl = f.label.toLowerCase();
      const el = await page.$(`#${f.id}`);
      if (!el) continue;

      if (lbl.includes('first name') || f.name.includes('[25]')) {
        await el.type(PROFILE.firstName, { delay: 20 });
      } else if (lbl.includes('last name') || f.name.includes('[26]')) {
        await el.type(PROFILE.lastName, { delay: 20 });
      } else if (lbl.includes('email') || f.type === 'email' || f.name.includes('[27]')) {
        await el.type(PROFILE.email, { delay: 20 });
      } else if (lbl.includes('company') || f.name.includes('[28]')) {
        await el.type(PROFILE.company, { delay: 20 });
      } else if (lbl.includes('phone') || f.type === 'tel' || f.name.includes('[30]')) {
        await el.type(PROFILE.phone, { delay: 20 });
      } else if (lbl.includes('message') || f.type === 'textarea' || f.name.includes('[34]')) {
        await el.type(PROFILE.message, { delay: 10 });
      } else if (f.type === 'select-one') {
        // select option 1
        await page.evaluate((id) => {
          const s = document.getElementById(id);
          if (s && s.options.length > 1) {
            s.selectedIndex = 1;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, f.id);
      }
    }

    console.log('CS Mechanical: Submitting...');
    const submitBtn = await page.$('#form_contact-us button[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        submitBtn.click(),
        new Promise(r => setTimeout(r, 6000))
      ]);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const isConfirmed = /thank you|thanks for|received your message|successfully submitted/i.test(bodyText);
      console.log('CS Mechanical Result:', isConfirmed ? 'CONFIRMED' : 'Unconfirmed');
      console.log('CS Mechanical snippet:', bodyText.substring(0, 300).replace(/\n+/g, ' '));
      
      if (isConfirmed) {
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('contacted', 'Confirmed: Submitted via contact form on csmechanical.co/contact', 4221);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
          .run(4221, 'sent', 'Confirmed: Submitted via contact form on csmechanical.co/contact');
      }
    }
    await page.close();
  } catch (e) {
    console.log('CS Mechanical Error:', e.message);
  }

  await browser.close();
}

submitTargets();
