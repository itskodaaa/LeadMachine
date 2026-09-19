import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const LEADS = [
  { id: 4941, name: 'United Metal Spinning & Machining', domain: 'umspinning.com' },
  { id: 4942, name: 'Crew Metal Fabrication Co.', domain: 'crewmetal.com' },
  { id: 4943, name: 'David Engineering & Manufacturing', domain: 'davidengineering.com' },
  { id: 4944, name: 'Precision Metal Processing', domain: 'precisionmetalprocessing.com' },
  { id: 4945, name: 'Joor’s Welding and Metal Services', domain: 'joorsweldingandmetalservice.com' },
  { id: 4947, name: 'Pro Fab', domain: 'profabcorona.com' },
  { id: 4949, name: 'J & L Metal Products', domain: 'jlmetal.com' },
  { id: 4950, name: 'R & S Manufacturing of Southern California, Inc', domain: 'rsdoorproducts.com' },
  { id: 4951, name: 'K C Scott Manufacturing', domain: 'kcscott.net' },
  { id: 4952, name: 'Industrial Tool & Die Design Inc', domain: 'itdmfg.com' }
];

async function inspectLead(lead) {
  console.log(`\n==================================================`);
  console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.domain})`);
  console.log(`==================================================`);
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.setDefaultNavigationTimeout(20000);

    let mainUrl = `https://${lead.domain}`;
    let res;
    try {
      res = await page.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      console.log(`HTTPS failed: ${e.message}. Trying HTTP...`);
      mainUrl = `http://${lead.domain}`;
      try {
        res = await page.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (err2) {
        console.log(`HTTP also failed: ${err2.message}`);
        return;
      }
    }

    const currentUrl = page.url();
    const title = await page.title();
    console.log(`Loaded URL: ${currentUrl} | Title: ${title}`);

    // Look for contact / quote links
    const links = await page.evaluate(() => {
      const aTags = Array.from(document.querySelectorAll('a'));
      return aTags.map(a => ({
        text: a.innerText.trim(),
        href: a.href
      })).filter(l => /contact|quote|about|reach|touch|inquir/i.test(l.text) || /contact|quote|inquir/i.test(l.href));
    });
    console.log(`Relevant links found (${links.length}):`, links.slice(0, 5));

    // Check forms on current page
    const checkForms = async (p, pageName) => {
      const forms = await p.evaluate(() => {
        const formEls = Array.from(document.querySelectorAll('form'));
        return formEls.map((f, idx) => ({
          idx,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required,
            visible: i.offsetWidth > 0 && i.offsetHeight > 0
          })),
          hasCaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .cf-turnstile'),
          buttonText: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
        }));
      });
      console.log(`Forms on ${pageName} (${forms.length}):`, JSON.stringify(forms, null, 2));

      // Check iframes
      const iframes = await p.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(f => ({
          src: f.src,
          id: f.id,
          name: f.name
        }));
      });
      if (iframes.length > 0) {
        console.log(`Iframes on ${pageName}:`, iframes);
      }
      return forms;
    };

    let forms = await checkForms(page, 'Home');

    // If no form or forms have 0 inputs, let's navigate to contact page if available
    if (forms.length === 0 || forms.every(f => f.inputs.filter(i => i.visible).length === 0)) {
      const contactLink = links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      if (contactLink) {
        console.log(`Navigating to contact page: ${contactLink.href}`);
        try {
          await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 2000));
          await checkForms(page, 'Contact Page');
        } catch (e) {
          console.log(`Failed to navigate to contact link: ${e.message}`);
        }
      }
    }

  } catch (err) {
    console.log(`Error inspecting ${lead.domain}: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  for (const lead of LEADS) {
    await inspectLead(lead);
  }
}

run();
