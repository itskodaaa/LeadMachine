import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration and upcoming project quotes. Thank you, Pamela Jameson.'
};

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  // 1. TruTec Electric (#4582)
  console.log('================== TESTING #4582 TruTec Electric ==================');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.trutecelectric.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill out form
    const formRes = await page.evaluate((p) => {
      const f = document.querySelector('#Form_ContactSystemS1');
      if (!f) return 'Form not found';
      
      const fn = f.querySelector('[id*="FirstName"]');
      if (fn) fn.value = p.firstName;
      
      const ln = f.querySelector('[id*="LastName"]');
      if (ln) ln.value = p.lastName;
      
      const phone = f.querySelector('[id*="Phone"]');
      if (phone) phone.value = p.phone;
      
      const email = f.querySelector('[id*="EmailAddress"]');
      if (email) email.value = p.email;
      
      const addr = f.querySelector('[id*="Address"]');
      if (addr) addr.value = '100 Main St, Chicago, IL 60601';
      
      const leadType = f.querySelector('[id*="LeadTypeID"]');
      if (leadType) leadType.value = '1'; // "Yes, I am a potential new customer"
      
      const msg = f.querySelector('[id*="Message"]');
      if (msg) msg.value = p.message;
      
      const chk = f.querySelector('#GoogleAddress');
      if (chk) chk.checked = true;
      
      const consent = f.querySelector('#Consent');
      if (consent) consent.value = 'true';
      
      // Trigger change events
      f.querySelectorAll('input, select, textarea').forEach(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      return 'Form filled';
    }, OUTREACH);
    console.log('4582 form fill result:', formRes);
    
    // Click submit
    const submitBtn = await page.$('#Form_ContactSystemS1 button[type="submit"], #Form_ContactSystemS1 input[type="submit"], #Form_ContactSystemS1 button');
    if (submitBtn) {
      console.log('Clicking submit button for TruTec...');
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => console.log('Navigation timeout or AJAX submission')),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const pageText = await page.evaluate(() => document.body.innerText);
      const url = page.url();
      console.log('4582 post-submit URL:', url);
      const hasSuccess = /thank you|received|we will contact|success|in touch/i.test(pageText);
      console.log('4582 success signal detected:', hasSuccess);
      if (hasSuccess) {
        const snippet = pageText.match(/.{0,50}(?:thank you|received|we will contact|success|in touch).{0,50}/i);
        console.log('4582 match snippet:', snippet ? snippet[0] : '');
      } else {
        console.log('4582 text sample:', pageText.slice(0, 500));
      }
    } else {
      console.log('4582 submit button not found');
    }
    await page.close();
  } catch (e) {
    console.log('4582 Error:', e.message);
  }

  // 2. KDR Electrical Services (#4587)
  console.log('\n================== TESTING #4587 KDR Electrical Services ==================');
  try {
    const page = await browser.newPage();
    await page.goto('https://austinelectricalservice.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const fillRes = await page.evaluate((p) => {
      const f = document.querySelector('form');
      if (!f) return 'Form not found';
      
      // DO NOT touch input[name="website"] because it is a HONEYPOT!
      const name = f.querySelector('#name');
      if (name) name.value = p.fullName;
      
      const comp = f.querySelector('#company');
      if (comp) comp.value = p.company;
      
      const email = f.querySelector('#email');
      if (email) email.value = p.email;
      
      const phone = f.querySelector('#phone');
      if (phone) phone.value = p.phone;
      
      const aud = f.querySelector('#audience');
      if (aud) aud.value = 'Business Owner';
      
      const serv = f.querySelector('#service-type');
      if (serv) serv.value = 'Commercial Maintenance';
      
      const urgencyRadio = f.querySelector('input[name="urgency"][value="Scheduled"]');
      if (urgencyRadio) urgencyRadio.checked = true;
      
      const details = f.querySelector('#details');
      if (details) details.value = p.message;
      
      f.querySelectorAll('input, select, textarea').forEach(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      return 'KDR form filled';
    }, OUTREACH);
    console.log('4587 form fill:', fillRes);
    
    const btn = await page.$('form button[type="submit"]');
    if (btn) {
      console.log('Clicking submit button for KDR Electrical Services...');
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => console.log('Navigation timeout or AJAX')),
        btn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const pageText = await page.evaluate(() => document.body.innerText);
      const url = page.url();
      console.log('4587 post-submit URL:', url);
      const hasSuccess = /thank you|received|we will contact|success|in touch|request submitted/i.test(pageText);
      console.log('4587 success signal detected:', hasSuccess);
      if (hasSuccess) {
        const snippet = pageText.match(/.{0,50}(?:thank you|received|we will contact|success|in touch|request submitted).{0,50}/i);
        console.log('4587 match snippet:', snippet ? snippet[0] : '');
      } else {
        console.log('4587 text sample:', pageText.slice(0, 500));
      }
    }
    await page.close();
  } catch (e) {
    console.log('4587 Error:', e.message);
  }

  // 3. Electric Solutions LLC (#4588)
  console.log('\n================== TESTING #4588 Electric Solutions LLC ==================');
  try {
    const page = await browser.newPage();
    await page.goto('https://electric-solutionsllc.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('4588 Current URL:', page.url());
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('4588 All links count:', allLinks.length);
    const relevantLinks = allLinks.filter(l => /contact|about|service|quote|estimate/i.test(l.text) || /contact|about|service/i.test(l.href));
    console.log('4588 Relevant links:', JSON.stringify(relevantLinks));
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('4588 Home text snippet:', pageText);
    await page.close();
  } catch (e) {
    console.log('4588 Error:', e.message);
  }

  // 4. JMEG Electrical Contractors (#4579)
  console.log('\n================== TESTING #4579 JMEG Electrical Contractors ==================');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.jmeg.us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('4579 Current URL:', page.url());
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('4579 Links count:', links.length);
    const navLinks = links.filter(l => l.text.length > 0 && l.text.length < 40);
    console.log('4579 Nav links:', JSON.stringify(navLinks.slice(0, 20)));
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('4579 Home text snippet:', pageText);
    await page.close();
  } catch (e) {
    console.log('4579 Error:', e.message);
  }

  await browser.close();
}

run().catch(console.error);
