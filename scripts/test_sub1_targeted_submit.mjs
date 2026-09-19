import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
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
  zip: '85251',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

const HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
};

async function submit4674() {
  console.log('\n--- Submitting 4674 (AZ DC Electric) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders(HEADERS);
    await page.goto('https://azdcelectric.com/contact-electrician/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('4674 Contact URL:', page.url());

    // Check forms on /contact-electrician/
    const forms = await page.$$eval('form', fs => fs.map(f => ({
      id: f.id,
      inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, required: i.required }))
    })));
    console.log('Forms on contact page:', JSON.stringify(forms, null, 2));

    // Fill form
    const hasName = await page.$('input[name="name[first_name]"], input[name="first_name"], input[placeholder*="Name"]');
    if (hasName) await hasName.type(OUTREACH_PROFILE.fullName, { delay: 20 });

    const hasEmail = await page.$('input[name="email"], input[type="email"]');
    if (hasEmail) await hasEmail.type(OUTREACH_PROFILE.email, { delay: 20 });

    const hasPhone = await page.$('input[name="phone"], input[type="tel"]');
    if (hasPhone) await hasPhone.type(OUTREACH_PROFILE.phone, { delay: 20 });

    const hasZip = await page.$('input[name="Zipcode"], input[placeholder*="Zip"]');
    if (hasZip) await hasZip.type(OUTREACH_PROFILE.zip, { delay: 20 });

    const hasMsg = await page.$('textarea');
    if (hasMsg) await hasMsg.type(OUTREACH_PROFILE.message, { delay: 10 });

    // Select dropdown option if present
    const select = await page.$('select');
    if (select) {
      await page.evaluate(s => {
        if (s.options.length > 1) s.selectedIndex = 1;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }, select);
    }

    // Check terms checkbox if present
    const terms = await page.$('input[type="checkbox"]');
    if (terms) {
      await terms.click();
    }

    console.log('4674 fields filled. Submitting...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], .ff-btn-submit');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const postSubmitText = await page.evaluate(() => document.body.innerText);
      console.log('4674 post submit text:', postSubmitText.slice(0, 400).replace(/\n+/g, ' '));
      const confirmed = /thank you|received|sent|successfully|in touch|we will/i.test(postSubmitText);
      console.log('4674 Confirmed?', confirmed);
    }
  } catch (e) {
    console.log('4674 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function check4677Math() {
  console.log('\n--- Checking 4677 (Unique Electrical) Math & Form ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders(HEADERS);
    await page.goto('https://uniqueelectrical.com', { waitUntil: 'networkidle2', timeout: 30000 });

    const mathInfo = await page.evaluate(() => {
      const mathInput = document.querySelector('input[name="math"]');
      if (!mathInput) return null;
      // Get label or parent text for the math question
      const parent = mathInput.parentElement;
      return {
        parentText: parent ? parent.innerText : null,
        placeholder: mathInput.placeholder,
        outerHTML: parent ? parent.outerHTML : null
      };
    });
    console.log('4677 Math Info:', mathInfo);
  } catch (e) {
    console.log('4677 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await submit4674();
  await check4677Math();
}

main().catch(console.error);
