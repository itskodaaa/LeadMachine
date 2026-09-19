import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4139, name: 'L Squared Engineering', url: 'https://l2engineering.com' },
  { id: 4140, name: 'Las Haciendas Design & Engineering', url: 'https://hdeplans.com' },
  { id: 4141, name: 'Middleton Brown LLC', url: 'https://middletonbrown.net' },
  { id: 4142, name: 'VLZ Homes & Renovations LLC', url: 'https://vlzhomes-renovations.com' },
  { id: 4143, name: 'HTS Inc Consultants', url: 'https://htshouston.com' },
  { id: 4144, name: 'Tetra Land Services', url: 'https://tetralandservices.com' },
  { id: 4145, name: 'EHRA Engineering', url: 'https://ehra.team' },
  { id: 4146, name: 'HRA Engineering', url: 'https://hra-eng.com' },
  { id: 4147, name: 'NOMA Engineering & Construction', url: 'https://nomaengineering.com' },
  { id: 4148, name: 'MPCE, LLC', url: 'https://mpce-tx.com' },
];

async function inspectLead(browser, lead) {
  console.log(`\n==================================================`);
  console.log(`Checking #${lead.id}: ${lead.name} (${lead.url})`);
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  try {
    let res;
    try {
      res = await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 });
    } catch (e) {
      try {
        res = await page.goto(lead.url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e2) {
        console.log(`Failed to load ${lead.url}: ${e2.message}`);
        return;
      }
    }

    console.log(`Loaded URL: ${page.url()} (status: ${res ? res.status() : 'unknown'})`);
    console.log(`Title: ${await page.title()}`);

    // Check contact links
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|reach|connect|touch|quote|inquiry|consultation/i.test(a.text) || /contact|quote|inquiry/i.test(a.href))
        .filter(a => !a.href.startsWith('mailto:') && !a.href.startsWith('tel:'));
    });
    console.log(`Found ${contactLinks.length} contact links:`, contactLinks.slice(0, 5));

    // Check forms on current page
    const checkForms = async () => {
      return await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const formsData = forms.map(f => ({
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputCount: f.querySelectorAll('input, textarea, select').length,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          })),
          captchas: Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.className || c.src)
        }));
        return { formsData, iframes };
      });
    };

    let { formsData, iframes } = await checkForms();
    console.log(`Forms on current page: ${formsData.length}`);
    formsData.forEach((f, idx) => {
      console.log(` Form ${idx+1}: action=${f.action}, inputs=${f.inputCount}, captchas=${JSON.stringify(f.captchas)}`);
      console.log(` Inputs:`, f.inputs);
    });

    if (formsData.length === 0 && contactLinks.length > 0) {
      console.log(`Navigating to contact page: ${contactLinks[0].href}`);
      try {
        await page.goto(contactLinks[0].href, { waitUntil: 'networkidle2', timeout: 20000 });
        console.log(`Contact page loaded: ${page.url()}`);
        const cForms = await checkForms();
        console.log(`Forms on contact page: ${cForms.formsData.length}`);
        cForms.formsData.forEach((f, idx) => {
          console.log(` Contact Form ${idx+1}: action=${f.action}, inputs=${f.inputCount}, captchas=${JSON.stringify(f.captchas)}`);
          console.log(` Inputs:`, f.inputs);
        });
      } catch (err) {
        console.log(`Could not navigate to contact page: ${err.message}`);
      }
    }

  } catch (err) {
    console.log(`Error processing #${lead.id}: ${err.message}`);
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  for (const lead of leads) {
    await inspectLead(browser, lead);
  }

  await browser.close();
}

main().catch(console.error);
