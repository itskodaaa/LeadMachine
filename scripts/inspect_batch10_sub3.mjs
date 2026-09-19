import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leads = [
  { id: 4352, name: 'K Park Engineering', url: 'https://kparkengineering.com' },
  { id: 4353, name: 'Five Star Engineering LLC', url: 'https://5starengineeringllc.com' },
  { id: 4354, name: 'Engineered Solutions of Georgia', url: 'https://esogrepair.com' },
  { id: 4355, name: 'Aulick Engineering LLC', url: 'https://aulickengineering.com' },
  { id: 4356, name: 'Stratus Team, LLC', url: 'https://prime-eng.com' },
  { id: 4357, name: 'AtkinsRéalis', url: 'https://atkinsrealis.com' },
  { id: 4359, name: 'Westside Engineering', url: 'https://westside-engineering.com' },
  { id: 4360, name: 'Neel-Schaffer', url: 'https://neel-schaffer.com' },
  { id: 4361, name: 'Newcomb & Boyd', url: 'https://newcomb-boyd.com' },
  { id: 4362, name: 'Pioneer General Contracting', url: 'https://build-pioneer.com' }
];

async function inspectLeads() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  for (const lead of leads) {
    console.log(`\n========================================\nChecking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    try {
      await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 });
      const currentUrl = page.url();
      console.log(`Landed on: ${currentUrl}`);

      // Find contact links
      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(a => /contact|reach|touch|quote|inquiry/i.test(a.text) || /contact|reach|touch|quote|inquiry/i.test(a.href))
          .slice(0, 5);
      });
      console.log('Contact links:', contactLinks);

      // Check forms on current page
      const pageInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const captchas = Array.from(document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .g-recaptcha, .cf-turnstile, [data-sitekey]'));
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const emails = (document.body ? document.body.innerText : '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        return {
          formCount: forms.length,
          forms: forms.map(f => ({ id: f.id, action: f.action, className: f.className })),
          captchaCount: captchas.length,
          captchaSrc: captchas.map(c => c.getAttribute('src') || c.className),
          inputs: inputs.map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder })),
          iframes: iframes.slice(0, 5),
          emails: Array.from(new Set(emails))
        };
      });
      console.log('Homepage info:', JSON.stringify(pageInfo, null, 2));

      // If contact link exists and current page has no form, navigate to contact link
      if (pageInfo.formCount === 0 && contactLinks.length > 0) {
        const targetUrl = contactLinks[0].href;
        console.log(`Navigating to contact link: ${targetUrl}`);
        try {
          await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          const contactPageInfo = await page.evaluate(() => {
            const forms = Array.from(document.querySelectorAll('form'));
            const captchas = Array.from(document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .g-recaptcha, .cf-turnstile, [data-sitekey]'));
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
            const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
            const emails = (document.body ? document.body.innerText : '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
            return {
              url: window.location.href,
              formCount: forms.length,
              forms: forms.map(f => ({ id: f.id, action: f.action, className: f.className })),
              captchaCount: captchas.length,
              captchaSrc: captchas.map(c => c.getAttribute('src') || c.className),
              inputs: inputs.map(i => ({ name: i.name, type: i.type, id: i.id, placeholder: i.placeholder })),
              iframes: iframes.slice(0, 5),
              emails: Array.from(new Set(emails))
            };
          });
          console.log('Contact page info:', JSON.stringify(contactPageInfo, null, 2));
        } catch (e2) {
          console.log(`Failed navigating to contact link: ${e2.message}`);
        }
      }
    } catch (e) {
      console.log(`Error checking ${lead.name}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspectLeads();
