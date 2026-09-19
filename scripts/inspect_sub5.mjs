import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leads = [
  { id: 3371, url: 'https://axman.com' },
  { id: 3372, url: 'https://mkaainc.com' },
  { id: 3374, url: 'https://dunanusa.com' },
  { id: 3375, url: 'https://c-coninc.com' },
  { id: 3376, url: 'https://mjbwood.com' },
  { id: 3379, url: 'https://preciseconnections.com' },
  { id: 3380, url: 'https://precisioncontractingco.net' },
  { id: 3381, url: 'https://releasemasterinnovations.com' },
  { id: 3382, url: 'https://richardsonprecision.com' }
];

async function inspectLead(browser, lead) {
  console.log(`\n=== Inspecting Lead ${lead.id}: ${lead.url} ===`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  try {
    const res = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => {
      console.log(`Goto failed: ${e.message}`);
      return null;
    });
    
    if (!res) {
      console.log(`Result: Site inaccessible`);
      await page.close();
      return;
    }
    
    console.log(`Current URL: ${page.url()}`);
    console.log(`Status: ${res.status()}`);

    // Check contact links
    const contactLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links
        .filter(a => /contact|reach|quote|touch|inquir/i.test(a.innerText || a.href))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log(`Contact links found:`, contactLinks.slice(0, 5));

    // Check forms on current page
    const checkForms = async () => {
      return await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(f => ({
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name,
            type: i.type,
            placeholder: i.placeholder,
            id: i.id,
            required: i.required
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]')
        }));
      });
    };

    let forms = await checkForms();
    console.log(`Forms on main page count: ${forms.length}`);

    // If no form on main page, check first contact link
    if (forms.length === 0 && contactLinks.length > 0) {
      console.log(`Navigating to contact page: ${contactLinks[0].href}`);
      await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      console.log(`Contact page URL: ${page.url()}`);
      forms = await checkForms();
      console.log(`Forms on contact page count: ${forms.length}`);
    }

    if (forms.length > 0) {
      console.log(`Form 0 details:`, JSON.stringify(forms[0], null, 2));
    }
  } catch (err) {
    console.log(`Error inspecting ${lead.id}: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    await inspectLead(browser, lead);
  }

  await browser.close();
}

main().catch(console.error);
