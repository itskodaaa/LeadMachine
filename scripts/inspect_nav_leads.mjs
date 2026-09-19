import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const testLeads = [
  { id: 4902, company: 'Florida Industrial Solutions, LLC', url: 'https://shopfis.com' },
  { id: 4904, company: 'Willett Precision Machining', url: 'https://willettprecision.com' },
  { id: 4905, company: 'VIM Tools', url: 'https://vimtools.com' }
];

async function inspect(lead) {
  console.log(`\n================ Inspecting #${lead.id} ${lead.company} (${lead.url}) ================`);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    const res = await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log(`Status: ${res?.status()}, Final URL: ${page.url()}`);
    const title = await page.title();
    console.log(`Title: ${title}`);
    
    // Check forms
    const formsInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const inputs = Array.from(document.querySelectorAll('input, textarea, select, button'));
      const contactLinks = Array.from(document.querySelectorAll('a')).filter(a => {
        const t = (a.innerText + ' ' + (a.getAttribute('href') || '')).toLowerCase();
        return t.includes('contact') || t.includes('quote') || t.includes('touch');
      }).map(a => ({ text: a.innerText.trim(), href: a.href }));

      return {
        formCount: forms.length,
        inputsCount: inputs.length,
        contactLinks: contactLinks.slice(0, 5)
      };
    });
    console.log('Forms info:', formsInfo);

    if (formsInfo.contactLinks.length > 0 && formsInfo.formCount === 0) {
      console.log('Navigating to contact link:', formsInfo.contactLinks[0].href);
      await page.goto(formsInfo.contactLinks[0].href, { waitUntil: 'networkidle2', timeout: 20000 });
      console.log('Contact Page Title:', await page.title(), 'URL:', page.url());
      const contactPageForms = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(f => ({
          action: f.action,
          id: f.id,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder
          }))
        }));
      });
      console.log('Contact page forms:', JSON.stringify(contactPageForms, null, 2));
    }
  } catch (err) {
    console.error(`Error inspecting #${lead.id}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  for (const l of testLeads) {
    await inspect(l);
  }
}
main();
