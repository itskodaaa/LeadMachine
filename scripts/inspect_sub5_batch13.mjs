import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4600, name: 'Scientific Machine & Welding, Inc.', url: 'https://sm-w.com' },
  { id: 4601, name: 'H J Lockhart Metal Services', url: 'https://lockhartmetalservice.com' },
  { id: 4602, name: 'Smart Metal Studio', url: 'https://smartmetalstudio.com' },
  { id: 4604, name: 'MetalWork Austin', url: 'https://metalworkaustin.com' },
  { id: 4605, name: 'Supreme Custom Metalwork', url: 'https://supremecustommetalwork.com' },
  { id: 4606, name: 'Capitol Company', url: 'https://capitolcompany.com' },
  { id: 4607, name: 'Steel House MFG', url: 'https://steelhousemfg.com' },
  { id: 4608, name: 'Affinity Metalworks', url: 'https://affinitymetalworks.com' },
  { id: 4609, name: 'K & K Welding LLC', url: 'https://kkweldingllc.com' }
];

async function inspectLead(lead) {
  console.log(`\n========================================`);
  console.log(`Analyzing Lead #${lead.id}: ${lead.name} (${lead.url})`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  page.on('dialog', async d => {
    console.log(`  [Dialog]: ${d.type()} - ${d.message()}`);
    await d.dismiss();
  });

  try {
    await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`  Loaded URL: ${page.url()} | Title: ${await page.title()}`);

    // Check for contact links
    const contactLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .filter(a => {
          const h = (a.getAttribute('href') || '').toLowerCase();
          const t = (a.innerText || '').toLowerCase();
          return (h.includes('contact') || h.includes('quote') || h.includes('reach') || t.includes('contact') || t.includes('quote')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
        })
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log(`  Contact links found:`, contactLinks.slice(0, 3));

    // If on homepage and contact link exists, let's also check if current page has form
    let currentForms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => {
        return {
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          }))
        };
      });
    });

    if (currentForms.length === 0 && contactLinks.length > 0) {
      console.log(`  Navigating to contact link: ${contactLinks[0].href}`);
      await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`  Contact page URL: ${page.url()}`);
      currentForms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => {
          return {
            id: f.id,
            name: f.name,
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
              tag: i.tagName,
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              required: i.required,
              visible: i.offsetWidth > 0 && i.offsetHeight > 0
            }))
          };
        });
      });
    }

    console.log(`  Found ${currentForms.length} forms.`);
    for (const f of currentForms) {
      console.log(`    Form action="${f.action}" method="${f.method}" id="${f.id}"`);
      console.log(`    Inputs:`, f.inputs.filter(i => i.type !== 'hidden').map(i => `${i.name || i.id} (${i.type}, req=${i.required}, vis=${i.visible})`));
    }

    // Check for iframes or captchas
    const captchaInfo = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
      const recaptcha = document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]');
      const hcaptcha = document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
      const turnstile = document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
      return {
        iframes,
        recaptcha: !!recaptcha,
        hcaptcha: !!hcaptcha,
        turnstile: !!turnstile,
        bodyTextSnippet: document.body.innerText.slice(0, 300).replace(/\n+/g, ' ')
      };
    });
    console.log(`  Captcha detection:`, { recaptcha: captchaInfo.recaptcha, hcaptcha: captchaInfo.hcaptcha, turnstile: captchaInfo.turnstile });
    if (captchaInfo.iframes.length > 0) {
      console.log(`  Iframes:`, captchaInfo.iframes);
    }

  } catch (err) {
    console.log(`  Error inspecting:`, err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  for (const lead of leads) {
    await inspectLead(lead);
  }
}

run();
