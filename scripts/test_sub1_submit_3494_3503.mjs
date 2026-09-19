import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello,\n\nI am reaching out to express our interest in your precision machining and engineering services. We are looking for reliable partners for upcoming project quotes and potential collaboration. Kindly have a representative contact us at your earliest convenience.\n\nThank you,\nPamela Jameson'
};

async function submit3494() {
  console.log('\n========================================');
  console.log('Submitting Lead #3494: Advanced Productivity Engineering');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://ap-engineer.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForSelector('form.wpcf7-form', { timeout: 10000 });

    // Fill form
    await page.type('input[name="Name"]', OUTREACH.name, { delay: 30 });
    await page.type('input[name="email-156"]', OUTREACH.email, { delay: 30 });
    await page.type('input[name="telephone"]', OUTREACH.phone, { delay: 30 });
    await page.type('input[name="Company"]', OUTREACH.company, { delay: 30 });
    await page.type('input[name="your-subject"]', OUTREACH.subject, { delay: 30 });
    await page.type('textarea[name="Client-message"]', OUTREACH.message, { delay: 10 });

    console.log('Form filled. Submitting...');
    await Promise.all([
      page.click('form.wpcf7-form input[type="submit"]'),
      page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const responseOutput = document.querySelector('.wpcf7-response-output')?.innerText;
      const body = document.body.innerText;
      return { responseOutput, bodySnippet: body.slice(0, 500) };
    });

    console.log('3494 Response:', result.responseOutput);
    if (result.responseOutput && /thank|sent|success|received/i.test(result.responseOutput)) {
      console.log('SUCCESS for #3494!');
      const note = `Submitted via contact form: https://ap-engineer.com/contact-us/ | Confirmation: "${result.responseOutput.trim()}"`;
      db.prepare('UPDATE leads SET status = "contacted", notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 3494').run(note);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, "sent", ?, CURRENT_TIMESTAMP)').run(3494, note);
    } else {
      console.log('Response did not match success:', result.responseOutput);
    }
  } catch (e) {
    console.error('Error submitting #3494:', e.message);
  } finally {
    await browser.close();
  }
}

async function submit3503() {
  console.log('\n========================================');
  console.log('Submitting Lead #3503: Hendrix Consulting Engineers');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://hcengineer.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForSelector('form.wpcf7-form', { timeout: 10000 });

    // Fill form
    await page.type('input[name="your-name"]', OUTREACH.name, { delay: 30 });
    await page.type('input[name="your-email"]', OUTREACH.email, { delay: 30 });
    await page.type('input[name="your-subject"]', OUTREACH.subject, { delay: 30 });
    await page.type('textarea[name="your-message"]', OUTREACH.message, { delay: 10 });

    console.log('Form filled. Submitting...');
    await Promise.all([
      page.click('form.wpcf7-form input[type="submit"]'),
      page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const responseOutput = document.querySelector('.wpcf7-response-output')?.innerText;
      const body = document.body.innerText;
      return { responseOutput, bodySnippet: body.slice(0, 500) };
    });

    console.log('3503 Response:', result.responseOutput);
    if (result.responseOutput && /thank|sent|success|received/i.test(result.responseOutput)) {
      console.log('SUCCESS for #3503!');
      const note = `Submitted via contact form: https://hcengineer.com/contact-us/ | Confirmation: "${result.responseOutput.trim()}"`;
      db.prepare('UPDATE leads SET status = "contacted", notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 3503').run(note);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, "sent", ?, CURRENT_TIMESTAMP)').run(3503, note);
    } else {
      console.log('Response did not match success:', result.responseOutput);
    }
  } catch (e) {
    console.error('Error submitting #3503:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await submit3494();
  await submit3503();
}

main();
