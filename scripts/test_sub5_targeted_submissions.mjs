import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Check eelectricsf.com
  console.log('\n=== Check #4827 eelectricsf.com ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://eelectricsf.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const eInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
      const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text.toLowerCase().includes('contact') || l.href.toLowerCase().includes('contact'));
      return { title: document.title, forms, links, bodyTextSnippet: document.body.innerText.slice(0, 300) };
    });
    console.log('eelectricsf info:', JSON.stringify(eInfo, null, 2));
    await page.close();
  } catch (e) {
    console.log('eelectricsf error:', e.message);
  }

  // 2. Check agelectricalengineer.com
  console.log('\n=== Check #4830 agelectricalengineer.com ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://agelectricalengineer.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const agInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
      const links = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text.toLowerCase().includes('contact') || l.href.toLowerCase().includes('contact'));
      return { title: document.title, forms, links, bodyTextSnippet: document.body.innerText.slice(0, 400) };
    });
    console.log('agelectricalengineer info:', JSON.stringify(agInfo, null, 2));
    await page.close();
  } catch (e) {
    console.log('agelectricalengineer error:', e.message);
  }

  // 3. Submit Switchgear #4831
  console.log('\n=== Submit #4831 Switchgear (https://switchgearflorida.com/contact) ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://switchgearflorida.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Type into inputs
    await page.type('#contact_name', PROFILE.name, { delay: 50 });
    await page.type('#contact_email', PROFILE.email, { delay: 50 });
    await page.type('#contact_phone', PROFILE.phone, { delay: 50 });
    await page.type('#contact_message', PROFILE.message, { delay: 20 });
    
    console.log('Switchgear form filled. Submitting...');
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(e => null);
    await page.click('form[action*="contact"] input[type="submit"]');
    await navigationPromise;
    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodyText: document.body.innerText.slice(0, 1000),
        hasSuccess: document.body.innerText.toLowerCase().includes('thank') ||
                    document.body.innerText.toLowerCase().includes('sent') ||
                    document.body.innerText.toLowerCase().includes('received') ||
                    document.body.innerText.toLowerCase().includes('success')
      };
    });
    console.log('Switchgear result:', JSON.stringify(result, null, 2));
    await page.close();
  } catch (e) {
    console.log('Switchgear submit error:', e.message);
  }

  // 4. Submit Becai Electric #4835
  console.log('\n=== Submit #4835 Becai Electric (https://www.becaielectric.com/) ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.becaielectric.com/', { waitUntil: 'networkidle2', timeout: 35000 });
    
    // Intercept responses to see Wix form submission API
    page.on('response', async res => {
      if (res.url().includes('wix') || res.url().includes('form') || res.url().includes('submission')) {
        if (res.request().method() === 'POST') {
          console.log(`Becai POST response [${res.status()}]: ${res.url()}`);
        }
      }
    });

    const filled = await page.evaluate((profile) => {
      const nameInput = document.querySelector('input[name="name-*"]') || document.querySelector('input[placeholder*="Name"]');
      if (nameInput) {
        nameInput.value = profile.name;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const emailInput = document.querySelector('input[name="email"]') || document.querySelector('input[placeholder*="Email"]');
      if (emailInput) {
        emailInput.value = profile.email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const phoneInput = document.querySelector('input[name="phone"]') || document.querySelector('input[placeholder*="Phone"]');
      if (phoneInput) {
        phoneInput.value = profile.phone;
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const subjectInput = document.querySelector('input[name="subject"]') || document.querySelector('input[placeholder*="Subject"]');
      if (subjectInput) {
        subjectInput.value = profile.subject;
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const msgInput = document.querySelector('textarea');
      if (msgInput) {
        msgInput.value = profile.message;
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const checkbox = document.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        checkbox.click();
      }
      return { hasName: !!nameInput, hasEmail: !!emailInput, hasPhone: !!phoneInput, hasMsg: !!msgInput };
    }, PROFILE);

    console.log('Becai form inputs filled:', filled);

    // Scroll to and click Send button
    const btnHandle = await page.$('button::-p-text(Send)') || await page.$('button[type="submit"]') || await page.$('form button');
    if (btnHandle) {
      console.log('Clicking Send button...');
      await btnHandle.click();
      await new Promise(r => setTimeout(r, 6000));
    } else {
      console.log('No Send button handle found');
    }

    const becaiResult = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodyTextSnippet: document.body.innerText.slice(0, 1000),
        successSignals: Array.from(document.querySelectorAll('*')).filter(el => {
          const t = el.innerText?.toLowerCase() || '';
          return (t.includes('thanks') || t.includes('thank you') || t.includes('submitted')) && el.children.length === 0;
        }).map(el => el.innerText)
      };
    });
    console.log('Becai result:', JSON.stringify(becaiResult, null, 2));
    await page.close();
  } catch (e) {
    console.log('Becai submit error:', e.message);
  }

  await browser.close();
}

run();
