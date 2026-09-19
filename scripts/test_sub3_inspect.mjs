import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4867, name: 'Arrow Sheet Metal', url: 'https://arrowsheetmetaltampafl.com' },
  { id: 4868, name: 'Tampa Sheet Metal Co', url: 'https://tampasheetmetal.com' },
  { id: 4869, name: 'SWS Contracting LLC', url: 'https://swscontracting.com' },
  { id: 4870, name: 'Iron Transformation LLC', url: 'https://irontransformation.com' },
  { id: 4871, name: 'Quality Steel Fabricators', url: 'https://qualitysteelfab.com' },
  { id: 4872, name: 'Advantage Steel Inc', url: 'https://advantagesteelinc.com' },
  { id: 4873, name: 'Reliable Welding & Steel Supply', url: 'https://reliableweldingandsteelsupply.com' },
  { id: 4874, name: 'OdysseyFAB', url: 'https://odysseyfab.com' },
  { id: 4875, name: 'Tampa Metal Works Inc', url: 'https://tampametalworksinc.com' },
  { id: 4876, name: 'T-Top Welding', url: 'https://ttopweldingtampa.com' }
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  for (const lead of leads) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    console.log(`\n========================================\nChecking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      
      const finalUrl = page.url();
      console.log(`Landed on: ${finalUrl}`);

      // Check contact links
      const contactLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|reach|connect/i.test(a.text) || /contact|quote/i.test(a.href))
          .slice(0, 5);
      });
      console.log('Contact links:', contactLinks);

      // Check form on current page
      const inspectForm = async (pg) => {
        return await pg.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
          const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
          const hasRecaptcha = !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"]');
          const isWix = !!window.wixBiSession || !!document.querySelector('[id*="wix"]');
          const isWP = !!document.querySelector('link[href*="wp-content"], script[src*="wp-content"]');
          const isSquarespace = !!document.querySelector('link[href*="squarespace"], body.has-site-title');
          const isGoDaddy = !!document.querySelector('meta[content*="GoDaddy"], #bs-4');

          return {
            formCount: forms.length,
            inputCount: inputs.length,
            platform: isWix ? 'Wix' : isWP ? 'WordPress' : isSquarespace ? 'Squarespace' : isGoDaddy ? 'GoDaddy' : 'Other',
            hasRecaptcha,
            iframes,
            inputs: inputs.map(i => ({
              tag: i.tagName.toLowerCase(),
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              required: i.required,
              ariaLabel: i.getAttribute('aria-label')
            })),
            buttons: Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => ({
              tag: b.tagName.toLowerCase(),
              type: b.type,
              text: b.innerText || b.value
            }))
          };
        });
      };

      let formInfo = await inspectForm(page);
      let pageUsed = finalUrl;
      if (formInfo.inputCount === 0 && contactLinks.length > 0) {
        for (const cl of contactLinks) {
          if (cl.href && cl.href !== finalUrl && !cl.href.startsWith('tel:') && !cl.href.startsWith('mailto:')) {
            console.log(`Navigating to contact page: ${cl.href}`);
            try {
              await page.goto(cl.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await new Promise(r => setTimeout(r, 2000));
              formInfo = await inspectForm(page);
              pageUsed = page.url();
              if (formInfo.inputCount > 0) break;
            } catch (e) {
              console.log(`Failed to navigate to ${cl.href}: ${e.message}`);
            }
          }
        }
      }
      console.log(`Page checked: ${pageUsed}`);
      console.log('Form info:', JSON.stringify(formInfo, null, 2));

    } catch (err) {
      console.log(`Error checking lead #${lead.id}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
