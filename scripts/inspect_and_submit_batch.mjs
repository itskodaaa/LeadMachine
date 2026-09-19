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
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function test4902(browser) {
  console.log('=== TEST #4902 (shopfis.com) ===');
  const page = await browser.newPage();
  try {
    await page.goto('https://shopfis.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log('4902 Title:', await page.title(), 'URL:', page.url());
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const text = document.body ? document.body.innerText : '';
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text.toLowerCase().includes('contact') || l.href.includes('contact'));
      return { formsCount: forms.length, links, hasEmail: text.includes('@'), snippet: text.slice(0, 300) };
    });
    console.log('4902 info:', info);
  } catch (e) {
    console.log('4902 error:', e.message);
  } finally {
    await page.close();
  }
}

async function test4903(browser) {
  console.log('=== TEST #4903 (advancetoolfla.com) ===');
  const page = await browser.newPage();
  try {
    await page.goto('https://advancetoolfla.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const formHtml = await page.evaluate(() => {
      const f = document.querySelector('form');
      return f ? f.outerHTML : 'no form';
    });
    console.log('4903 Form HTML:\n', formHtml.slice(0, 1000));

    // Try filling
    await page.evaluate((p) => {
      const nameInp = document.querySelector('#input203792');
      const emailInp = document.querySelector('#input203793');
      const msgInp = document.querySelector('textarea');
      if (nameInp) nameInp.value = p.fullName;
      if (emailInp) emailInp.value = p.email;
      if (msgInp) msgInp.value = p.message;
    }, OUTREACH_PROFILE);

    // Click submit
    console.log('4903 Submitting...');
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }).catch(e => console.log('nav timeout or no nav:', e.message)),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 3000));
      console.log('4903 Post submit URL:', page.url());
      const postText = await page.evaluate(() => document.body.innerText);
      console.log('4903 Post submit snippet:\n', postText.slice(0, 500));
    }
  } catch (e) {
    console.log('4903 error:', e.message);
  } finally {
    await page.close();
  }
}

async function test4904(browser) {
  console.log('=== TEST #4904 (willettprecision.com) ===');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.willettprecision.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));
    console.log('4904 Title:', await page.title(), 'URL:', page.url());
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => ((a.innerText || '') + a.href).toLowerCase().includes('contact'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log('4904 contact links:', links);
    if (links.length > 0) {
      await page.goto(links[0].href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise(r => setTimeout(r, 3000));
      console.log('4904 Contact Page Title:', await page.title(), 'URL:', page.url());
      const contactForm = await page.evaluate(() => {
        const form = document.querySelector('form');
        return form ? form.outerHTML : 'no form';
      });
      console.log('4904 Contact Form HTML:\n', contactForm.slice(0, 1000));
    }
  } catch (e) {
    console.log('4904 error:', e.message);
  } finally {
    await page.close();
  }
}

async function test4907(browser) {
  console.log('=== TEST #4907 (bayareacontractorssupply.com/contact/) ===');
  const page = await browser.newPage();
  try {
    await page.goto('https://bayareacontractorssupply.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    console.log('4907 Contact Title:', await page.title(), 'URL:', page.url());
    const formHtml = await page.evaluate(() => {
      const f = document.querySelector('form:not([role="search"])');
      const text = document.body ? document.body.innerText : '';
      return { form: f ? f.outerHTML : 'no form', textSnippet: text.slice(0, 500) };
    });
    console.log('4907 Form info:', formHtml);
  } catch (e) {
    console.log('4907 error:', e.message);
  } finally {
    await page.close();
  }
}

async function test4910(browser) {
  console.log('=== TEST #4910 (grabberpro.com/ContactUs) ===');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.grabberpro.com/ContactUs', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('4910 Title:', await page.title(), 'URL:', page.url());
    const iframes = await page.evaluate(() => {
      const frames = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      const text = document.body ? document.body.innerText : '';
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.outerHTML);
      return { frames, formsCount: forms.length, snippet: text.slice(0, 400) };
    });
    console.log('4910 info:', iframes);
  } catch (e) {
    console.log('4910 error:', e.message);
  } finally {
    await page.close();
  }
}

async function test4911(browser) {
  console.log('=== TEST #4911 (tampaindustrialsupply.com/contact.php) ===');
  const page = await browser.newPage();
  try {
    await page.goto('https://tampaindustrialsupply.com/contact.php', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Fill and submit form
    await page.evaluate((p) => {
      document.querySelector('#contactname').value = p.fullName;
      document.querySelector('#contactemail').value = p.email;
      document.querySelector('#contactsubject').value = p.subject;
      document.querySelector('#contactmessage').value = p.message;
    }, OUTREACH_PROFILE);

    console.log('4911 Submitting...');
    const submitBtn = await page.$('input[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('4911 nav timeout:', e.message)),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 3000));
      console.log('4911 Post submit URL:', page.url());
      const postText = await page.evaluate(() => document.body ? document.body.innerText : '');
      console.log('4911 Post submit text:\n', postText.slice(0, 600));
    }
  } catch (e) {
    console.log('4911 error:', e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await test4902(browser);
  await test4903(browser);
  await test4904(browser);
  await test4907(browser);
  await test4910(browser);
  await test4911(browser);

  await browser.close();
}

main();
