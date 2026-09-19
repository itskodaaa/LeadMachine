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

async function submitBaldwin() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    console.log('Navigating to Baldwin Metals contact page...');
    await page.goto('https://baldwinmetals.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('#wpforms-10-field_0', { timeout: 10000 });
    await page.type('#wpforms-10-field_0', OUTREACH_PROFILE.fullName, { delay: 50 });
    await page.type('#wpforms-10-field_1', OUTREACH_PROFILE.email, { delay: 50 });
    await page.type('#wpforms-10-field_2', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Form filled. Submitting...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
      page.click('#wpforms-submit-10')
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const pageText = await page.evaluate(() => document.body.innerText);
    const confirmation = await page.evaluate(() => {
      const el = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation-scroll');
      return el ? el.innerText : null;
    });

    console.log('Confirmation element text:', confirmation);
    console.log('Page snippet:', pageText.slice(0, 500));

    if ((confirmation && /thank|received|sent|contact/i.test(confirmation)) || /thanks for contacting us|we will be in touch/i.test(pageText)) {
      console.log('SUCCESS confirmed for Baldwin Metals!');
      const note = `Confirmed: Baldwin Metals Inc contact form submitted successfully (${confirmation || 'Thanks for contacting us! We will be in touch with you shortly.'})`;
      db.prepare('UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?')
        .run('contacted', ' | ' + note, 4776);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run(4776, 'sent', note);
      console.log('Database updated successfully for #4776.');
    } else {
      console.log('Confirmation text not found or unconfirmed.');
    }

  } catch (e) {
    console.error('Error submitting Baldwin Metals:', e.message);
  } finally {
    await browser.close();
  }
}

submitBaldwin();
