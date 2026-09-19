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

async function testLandAndMoore() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. LAND ENGINEERING
  console.log('--- Submitting Land Engineering (4480) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.land.engineering/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Fill fields
    await page.type('input[aria-label="First name"]', OUTREACH_PROFILE.firstName, { delay: 30 });
    await page.type('input[aria-label="Last name"]', OUTREACH_PROFILE.lastName, { delay: 30 });
    await page.type('input[aria-label="Email"]', OUTREACH_PROFILE.email, { delay: 30 });
    // Try phone formatted
    await page.type('input[aria-label="Phone. Phone"]', '708-568-3708', { delay: 30 });
    await page.type('input[aria-label="Subject"]', OUTREACH_PROFILE.subject, { delay: 30 });
    await page.type('textarea[aria-label="Message"]', OUTREACH_PROFILE.message, { delay: 30 });

    // Check if "Enter a valid phone number" appears
    let phoneError = await page.evaluate(() => document.body.innerText.includes('Enter a valid phone number'));
    if (phoneError) {
      console.log('Phone error present with dashes, clearing phone...');
      const phoneInput = await page.$('input[aria-label="Phone. Phone"]');
      await phoneInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
    }

    const submitBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'submit');
    });
    console.log('Clicking Submit button on Land Engineering...');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 6000));

    const postSubmit = await page.evaluate(() => {
      // Look for thank you or confirmation message
      const texts = Array.from(document.querySelectorAll('*'))
        .filter(el => el.children.length === 0 && (el.innerText || '').trim().length > 0)
        .map(el => (el.innerText || '').trim());
      const confirmMatches = texts.filter(t => /thank|received|success|sent|we'll be in touch/i.test(t));
      return { confirmMatches, sample: texts.slice(0, 30) };
    });
    console.log('Land Engineering confirmation:', postSubmit.confirmMatches);
    await page.close();
  } catch (e) {
    console.log('Land Engineering error:', e.message);
  }

  // 2. MOORE BASS
  console.log('\n--- Submitting Moore Bass (4478) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.moorebass.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Inspect visible form
    const visibleFormId = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      for (const f of forms) {
        const rect = f.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(f).display !== 'none') {
          return {
            id: f.id,
            inputs: Array.from(f.querySelectorAll('input, textarea, button')).map(i => ({
              tag: i.tagName,
              name: i.name,
              id: i.id,
              type: i.type,
              visible: i.offsetWidth > 0 && i.offsetHeight > 0
            }))
          };
        }
      }
      return null;
    });
    console.log('Moore Bass visible form:', JSON.stringify(visibleFormId, null, 2));

    if (visibleFormId) {
      const formSelector = `#${visibleFormId.id}`;
      // Fill visible inputs
      for (const inp of visibleFormId.inputs) {
        if (!inp.visible || inp.type === 'hidden' || inp.type === 'submit') continue;
        const selector = inp.id ? `#${inp.id}` : `${formSelector} [name="${inp.name}"]`;
        const name = (inp.name || inp.id).toLowerCase();
        if (name.includes('name') && !name.includes('company')) {
          await page.type(selector, OUTREACH_PROFILE.fullName);
        } else if (name.includes('company')) {
          await page.type(selector, OUTREACH_PROFILE.company);
        } else if (name.includes('job') || name.includes('title')) {
          await page.type(selector, 'Procurement Manager');
        } else if (name.includes('email')) {
          await page.type(selector, OUTREACH_PROFILE.email);
        } else if (name.includes('phone')) {
          await page.type(selector, OUTREACH_PROFILE.phone);
        } else if (name.includes('address_1')) {
          await page.type(selector, '100 Main St');
        } else if (name.includes('city')) {
          await page.type(selector, 'Chicago');
        } else if (name.includes('state')) {
          await page.type(selector, 'IL');
        } else if (name.includes('zip')) {
          await page.type(selector, '60601');
        } else if (inp.tag === 'TEXTAREA' || name.includes('desc') || name.includes('message')) {
          await page.type(selector, OUTREACH_PROFILE.message);
        } else if (inp.type === 'checkbox') {
          await page.click(selector);
        }
      }

      // Find submit button in this form
      const submitBtn = await page.$(`${formSelector} input[type="submit"], ${formSelector} button[type="submit"]`);
      if (submitBtn) {
        console.log('Clicking Moore Bass submit button...');
        await Promise.all([
          page.waitForNavigation({ timeout: 10000, waitUntil: 'networkidle2' }).catch(() => null),
          submitBtn.click()
        ]);
        console.log('Moore Bass post submit URL:', page.url());
        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasConfirm = /thank|received|success|in touch|contact you/i.test(bodyText);
        console.log('Moore Bass confirmed:', hasConfirm);
        if (hasConfirm) {
          const matched = bodyText.match(/.*(thank|received|success|in touch|contact you).*/i);
          console.log('Moore Bass match snippet:', matched ? matched[0] : '');
        }
      }
    }
    await page.close();
  } catch (e) {
    console.log('Moore Bass error:', e.message);
  }

  // 3. DRMP
  console.log('\n--- Checking DRMP (4486) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://drmp.com/connect/', { waitUntil: 'networkidle2', timeout: 25000 });
    const content = await page.evaluate(() => {
      return {
        url: window.location.href,
        links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })),
        forms: Array.from(document.querySelectorAll('form')).map(f => f.action)
      };
    });
    console.log('DRMP /connect/ URL:', content.url);
    console.log('DRMP forms:', content.forms);
    console.log('DRMP email links:', content.links.filter(l => l.href.startsWith('mailto:')));
    await page.close();
  } catch (e) {
    console.log('DRMP error:', e.message);
  }

  await browser.close();
}

testLandAndMoore();
