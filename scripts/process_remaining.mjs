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
  title: 'Procurement Specialist',
  address: '100 Main St, Chicago, IL 60601',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you,
Pamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  // --- LEAD #3306: Tovey Engineering ---
  console.log('\n========================================\n--- Processing #3306 Tovey Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.toveyengineering.com/request-information', { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    await page.type('#first_name', OUTREACH_PROFILE.firstName);
    await page.type('#last_name', OUTREACH_PROFILE.lastName);
    await page.type('#email', OUTREACH_PROFILE.email);
    await page.type('#phone', OUTREACH_PROFILE.phone);
    await page.type('#company', OUTREACH_PROFILE.company);
    await page.type('#title', OUTREACH_PROFILE.title);
    await page.type('#address', OUTREACH_PROFILE.address);
    await page.type('#request', OUTREACH_PROFILE.message);
    
    // Check quote checkbox
    const quoteCheckbox = await page.$('input[name="quote"]');
    if (quoteCheckbox) await quoteCheckbox.click();

    console.log('Fields filled for #3306. Clicking submit...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => null),
      page.click('#RequestInfoSubmitButton')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const toveyUrl = page.url();
    const toveyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log('Tovey post-submit URL:', toveyUrl);
    console.log('Tovey post-submit Text snippet:', toveyText.replace(/\n+/g, ' '));
    await page.close();
  } catch (e) {
    console.log('3306 Error:', e.message);
  }

  // --- LEAD #3305: Industrial Design Solutions ---
  console.log('\n========================================\n--- Processing #3305 Industrial Design Solutions ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://idspower.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const formFields = await page.evaluate(() => {
      const form = document.querySelector('form[id*="gform"]');
      if (!form) return null;
      return Array.from(form.querySelectorAll('input, textarea, select')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        classes: i.className
      }));
    });
    console.log('IDS form fields:', formFields);
    await page.close();
  } catch (e) {
    console.log('3305 Error:', e.message);
  }

  // --- LEAD #3301: Industrial Electric ---
  console.log('\n========================================\n--- Inspecting #3301 Industrial Electric ---');
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });
    await page.goto('https://industrialelectricinc.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('3301 loaded URL:', page.url());
    console.log('3301 title:', await page.title());
    const links3301 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|quote|about/i.test(a.text) || /contact/i.test(a.href));
    });
    console.log('3301 links:', links3301);
    await page.close();
  } catch (e) {
    console.log('3301 Error:', e.message);
  }

  // --- LEAD #3302: BEK ELECTRIC SERVICES ---
  console.log('\n========================================\n--- Inspecting #3302 BEK ELECTRIC SERVICES ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://bekelectricaz.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('3302 loaded URL:', page.url());
    console.log('3302 title:', await page.title());
    const links3302 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|quote|about/i.test(a.text) || /contact/i.test(a.href));
    });
    console.log('3302 links:', links3302);
    const body3302 = await page.evaluate(() => document.body.innerText.slice(0, 600));
    console.log('3302 body snippet:', body3302.replace(/\n+/g, ' '));
    await page.close();
  } catch (e) {
    console.log('3302 Error:', e.message);
  }

  // --- LEAD #3303: Georgia-Pacific ---
  console.log('\n========================================\n--- Inspecting #3303 Georgia-Pacific ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.gp.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('3303 loaded URL:', page.url());
    const footerLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('footer a, nav a, a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|feedback|reach|inquiry/i.test(a.text) || /contact/i.test(a.href));
    });
    console.log('3303 contact links:', footerLinks);
    await page.close();
  } catch (e) {
    console.log('3303 Error:', e.message);
  }

  await browser.close();
}

run();
