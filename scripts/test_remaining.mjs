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
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express interest in your services and discuss potential project quotes. Please contact me at your convenience.'
};

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Test 1: Moore Bass Contact Page
  console.log('\n--- Checking Moore Bass (4478) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.moorebass.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    const mbInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
          tag: i.tagName,
          name: i.name,
          type: i.type,
          placeholder: i.placeholder,
          text: i.innerText
        }))
      }));
      const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
      return { forms, iframes };
    });
    console.log('Moore Bass Forms:', JSON.stringify(mbInfo.forms, null, 2));
    console.log('Moore Bass Iframes:', mbInfo.iframes);

    // If form exists on Moore Bass, let's try filling it
    if (mbInfo.forms.length > 0) {
      console.log('Filling Moore Bass form...');
      const form = await page.$('form');
      const inputs = await form.$$('input, textarea');
      for (const input of inputs) {
        const type = await (await input.getProperty('type')).jsonValue();
        const name = (await (await input.getProperty('name')).jsonValue()) || '';
        const id = (await (await input.getProperty('id')).jsonValue()) || '';
        const placeholder = (await (await input.getProperty('placeholder')).jsonValue()) || '';
        const fieldStr = `${name} ${id} ${placeholder}`.toLowerCase();

        if (type === 'hidden' || type === 'submit') continue;

        if (fieldStr.includes('name') && !fieldStr.includes('last')) {
          await input.type(OUTREACH_PROFILE.fullName);
        } else if (fieldStr.includes('last')) {
          await input.type(OUTREACH_PROFILE.lastName);
        } else if (fieldStr.includes('email')) {
          await input.type(OUTREACH_PROFILE.email);
        } else if (fieldStr.includes('phone') || fieldStr.includes('tel')) {
          await input.type(OUTREACH_PROFILE.phone);
        } else if (fieldStr.includes('company')) {
          await input.type(OUTREACH_PROFILE.company);
        } else if (fieldStr.includes('subject')) {
          await input.type(OUTREACH_PROFILE.subject);
        } else if (fieldStr.includes('message') || fieldStr.includes('comment') || fieldStr.includes('desc')) {
          await input.type(OUTREACH_PROFILE.message);
        }
      }

      const submitBtn = await page.$('form input[type="submit"], form button[type="submit"], form button');
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle2' }).catch(() => null),
          submitBtn.click()
        ]);
        console.log('Submitted Moore Bass form, post-submit URL:', page.url());
        const bodyText = await page.evaluate(() => document.body.innerText);
        const confirmed = /thank|received|success|contact you|shortly/i.test(bodyText);
        console.log('Confirmation detected on Moore Bass?:', confirmed);
        console.log('Body snippet:', bodyText.replace(/\s+/g, ' ').slice(0, 300));
      }
    }
    await page.close();
  } catch (e) {
    console.log('Moore Bass error:', e.message);
  }

  // Test 2: Land Engineering (4480)
  console.log('\n--- Checking Land Engineering (4480) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.land.engineering/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Fill Wix form
    const firstName = await page.$('input[aria-label="First name"]');
    if (firstName) await firstName.type(OUTREACH_PROFILE.firstName, { delay: 50 });

    const lastName = await page.$('input[aria-label="Last name"]');
    if (lastName) await lastName.type(OUTREACH_PROFILE.lastName, { delay: 50 });

    const email = await page.$('input[aria-label="Email"]');
    if (email) await email.type(OUTREACH_PROFILE.email, { delay: 50 });

    const phone = await page.$('input[aria-label="Phone. Phone"]');
    if (phone) await phone.type(OUTREACH_PROFILE.phone, { delay: 50 });

    const subject = await page.$('input[aria-label="Subject"]');
    if (subject) await subject.type(OUTREACH_PROFILE.subject, { delay: 50 });

    const message = await page.$('textarea[aria-label="Message"]');
    if (message) await message.type(OUTREACH_PROFILE.message, { delay: 50 });

    console.log('Typed all fields on Land Engineering. Clicking Submit...');
    const submitBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'submit');
    });
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked submit on Land Engineering, waiting for confirmation...');
      await new Promise(r => setTimeout(r, 8000));
      const postSubmitText = await page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('[role="alert"], [data-testid="message"], p, div, span'))
          .map(el => el.innerText.trim())
          .filter(t => /thank|received|success|submit/i.test(t));
        return { msgs, sample: document.body.innerText.slice(0, 500) };
      });
      console.log('Land Engineering post-submit messages:', postSubmitText.msgs);
    }
    await page.close();
  } catch (e) {
    console.log('Land Engineering error:', e.message);
  }

  // Test 3: DRMP (4486)
  console.log('\n--- Checking DRMP (4486) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://drmp.com/connect', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('DRMP URL after /connect:', page.url());
    const drmpInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }));
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.action);
      return { links: links.filter(l => /contact|connect/i.test(l.text || l.href)), forms, body: document.body.innerText.slice(0, 300) };
    });
    console.log('DRMP info:', drmpInfo);
    await page.close();
  } catch (e) {
    console.log('DRMP error:', e.message);
  }

  await browser.close();
}

main();
