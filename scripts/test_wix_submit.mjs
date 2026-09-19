import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  company: 'Northeast Precision Machinery, Inc.',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your precision machining services and request quotes on upcoming projects.'
};

async function testGSI() {
  console.log('\n--- Testing GSI International (#4737) with page.type ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.gsiinternational.com/contact', { waitUntil: 'networkidle2' });
    
    // Inputs:
    // First name
    const fn = await page.$('input[placeholder="First name"]');
    if (fn) { await fn.click(); await fn.type(PROFILE.firstName, { delay: 30 }); }
    
    // Last name
    const ln = await page.$('input[placeholder="Last name"]');
    if (ln) { await ln.click(); await ln.type(PROFILE.lastName, { delay: 30 }); }
    
    // Company name
    const comp = await page.$('input[aria-label="Company name"]');
    if (comp) { await comp.click(); await comp.type(PROFILE.company, { delay: 30 }); }
    
    // Email
    const em = await page.$('input[placeholder="Email"]');
    if (em) { await em.click(); await em.type(PROFILE.email, { delay: 30 }); }
    
    // Phone
    const ph = await page.$('input[placeholder="Phone"]');
    if (ph) { await ph.click(); await ph.type(PROFILE.phone, { delay: 30 }); }
    
    // Message
    const msg = await page.$('textarea');
    if (msg) { await msg.click(); await msg.type(PROFILE.message, { delay: 10 }); }

    console.log('All fields typed. Finding Submit button...');
    const submitBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'SUBMIT');
    });

    if (submitBtn) {
      console.log('Clicking SUBMIT...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      
      const res = await page.evaluate(() => {
        const successMsg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
        return {
          successText: successMsg ? successMsg.innerText : null,
          bodyHasThanks: /thanks|thank you|submitted/i.test(document.body.innerText)
        };
      });
      console.log('Submission result:', res);
    } else {
      console.log('Submit button not found!');
    }
  } catch (e) {
    console.log('Error on GSI:', e.message);
  } finally {
    await browser.close();
  }
}

async function testToolCrib() {
  console.log('\n--- Testing Tool Crib (#4729) with page.type ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.thetoolcribaz.com/', { waitUntil: 'networkidle2' });
    
    // Fill Tool Crib Wix inputs
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const inp of inputs) {
        const label = (inp.closest('[data-testid]')?.innerText || inp.closest('div')?.innerText || '').toLowerCase();
        if (label.includes('first name')) inp.value = p.firstName;
        else if (label.includes('last name')) inp.value = p.lastName;
        else if (label.includes('company')) inp.value = p.company;
        else if (label.includes('email')) inp.value = p.email;
        else if (label.includes('phone')) inp.value = p.phone;
        else if (label.includes('looking for') || inp.tagName === 'TEXTAREA') inp.value = p.message;
        
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    // Click submit
    const submitBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'submit');
    });

    if (submitBtn) {
      console.log('Clicking Tool Crib Submit...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const res = await page.evaluate(() => {
        const successMsg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
        return {
          successText: successMsg ? successMsg.innerText : null,
          bodyHasThanks: /thanks|thank you|submitted/i.test(document.body.innerText)
        };
      });
      console.log('Tool Crib Submission result:', res);
    }
  } catch (e) {
    console.log('Error on Tool Crib:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testGSI();
  await testToolCrib();
}

run();
