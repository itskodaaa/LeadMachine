import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const sleep = ms => new Promise(res => setTimeout(res, ms));

const leads = [
  { id: 4082, name: 'ATM ENGINEERING', url: 'https://atmeng.com' },
  { id: 4083, name: 'GOAL Associates Inc.', url: 'https://goalassociates.com' },
  { id: 4084, name: 'Dynatech Engineering Corporation', url: 'https://dynatechengineering.com' },
  { id: 4085, name: 'Ashraf Consulting Engineers, Inc.', url: 'https://ashengineers.com' },
  { id: 4086, name: 'Robayna & Associates', url: 'https://robayna.com' },
  { id: 4087, name: 'Ross Engineering, Inc.', url: 'https://rossengineers.com' },
  { id: 4088, name: 'iES Engineering', url: 'https://ies-eng.net' },
  { id: 4089, name: 'Corosal Consulting LLC', url: 'https://corosalconsulting.com' },
  { id: 4090, name: 'The Falcon Group', url: 'https://thefalcongroup.us' },
  { id: 4091, name: 'Naranjo Engineering Consultants LLC', url: 'https://necengineers.com' }
];

async function inspectLeads() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n========================================\n[#${lead.id}] ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      
      let res = await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log(`Home err: ${e.message}`));
      await sleep(2000);

      const title = await page.title();
      const currentUrl = page.url();
      console.log(`Title: ${title} | URL: ${currentUrl}`);

      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|reach|about|inquir/i.test(a.text) || /contact|reach|about/i.test(a.href));
      });
      console.log('Contact links found:', JSON.stringify(contactLinks.slice(0, 5)));

      const checkForms = async (pg) => {
        return await pg.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]), textarea, select'));
          const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
          const recaptchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], div[class*="captcha"]')).length;
          return {
            formCount: forms.length,
            forms: forms.map(f => ({
              action: f.action,
              id: f.id,
              className: f.className,
              fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
                tag: el.tagName.toLowerCase(),
                name: el.name,
                type: el.type,
                id: el.id,
                placeholder: el.placeholder,
                text: el.innerText
              }))
            })),
            standaloneInputs: inputs.map(i => ({ tag: i.tagName.toLowerCase(), name: i.name, type: i.type, id: i.id, placeholder: i.placeholder })),
            iframes,
            recaptchas
          };
        });
      };

      let formInfo = await checkForms(page);
      console.log(`Home page forms: ${formInfo.formCount}, inputs: ${formInfo.standaloneInputs.length}, recaptchas: ${formInfo.recaptchas}`);

      if (formInfo.formCount === 0 && contactLinks.length > 0) {
        const targetLink = contactLinks.find(l => /contact/i.test(l.href)) || contactLinks[0];
        console.log(`Navigating to contact page: ${targetLink.href}`);
        await page.goto(targetLink.href, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log(`Contact err: ${e.message}`));
        await sleep(2000);
        formInfo = await checkForms(page);
        console.log(`Contact page forms: ${formInfo.formCount}, inputs: ${formInfo.standaloneInputs.length}, recaptchas: ${formInfo.recaptchas}`);
      }
      if (formInfo.formCount > 0) {
        console.log('Forms detail:', JSON.stringify(formInfo.forms, null, 2));
      }
    } catch (err) {
      console.log(`General error: ${err.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

inspectLeads();
