import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4237, name: 'Turner Precision Engineering', url: 'https://canibbletools.com' },
  { id: 4238, name: 'PND Engineers, Inc. Houston', url: 'https://pndengineers.com' },
  { id: 4239, name: 'VMC Precision LLC', url: 'https://vmcprecisionllc.com' },
  { id: 4240, name: 'Liberty Precision Company, LLC', url: 'https://libertypc.com' },
  { id: 4241, name: 'Rockwell Precision Inc', url: 'https://rpitex.com' },
  { id: 4242, name: 'TRILOGY PRECISION', url: 'https://trilogyprecision.com' },
  { id: 4243, name: 'Precision Machinery Contractors', url: 'https://precisionmachllc.com' },
  { id: 4244, name: 'Titanium Engineers Inc', url: 'https://titaniumengineers.com' },
  { id: 4245, name: 'FERPA Precision Machine Inc', url: 'https://ferpa-pmi.com' },
];

async function inspectLead(lead) {
  console.log(`\n========================================\n[Detail] #${lead.id} ${lead.name} (${lead.url})`);
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Listen to network requests/responses
    page.on('response', resp => {
      const u = resp.url();
      if (u.includes('admin-ajax') || u.includes('contact') || u.includes('wp-json') || u.includes('form') || u.includes('submit')) {
        console.log(`  [Net Resp] ${resp.status()} ${u.slice(0, 80)}`);
      }
    });

    const resp = await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
      console.log(`  Goto error: ${e.message}`);
      return null;
    });

    if (!resp) {
      console.log(`  Could not load ${lead.url}`);
      return;
    }

    console.log(`  Loaded URL: ${page.url()}`);
    const title = await page.title();
    console.log(`  Title: ${title}`);

    // Check contact links
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|quote|reach|get-in-touch/i.test(a.text) || /contact|quote/i.test(a.href));
    });
    console.log(`  Contact links:`, contactLinks.map(c => `${c.text} -> ${c.href}`));

    // Inspect forms on the current page
    async function checkForms(pg) {
      return await pg.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            value: el.value || '',
            text: el.innerText || ''
          }));
          return {
            formIdx: i,
            id: f.id,
            className: f.className,
            action: f.action,
            method: f.method,
            inputs
          };
        });
      });
    }

    let forms = await checkForms(page);
    console.log(`  Homepage Forms found: ${forms.length}`);
    for (const f of forms) {
      console.log(`   Form #${f.formIdx} id="${f.id}" class="${f.className}" action="${f.action}"`);
      console.log(`     Inputs: ${f.inputs.map(inp => `${inp.tag}[name=${inp.name}, type=${inp.type}, id=${inp.id}]`).join(', ')}`);
    }

    // Check if there is a contact link that is different from homepage
    for (const cl of contactLinks) {
      if (cl.href && cl.href !== page.url() && !cl.href.startsWith('mailto:') && !cl.href.startsWith('tel:')) {
        console.log(`  Navigating to contact link: ${cl.href}`);
        try {
          const cpage = await browser.newPage();
          await cpage.goto(cl.href, { waitUntil: 'networkidle2', timeout: 15000 });
          console.log(`    Contact page title: ${await cpage.title()}`);
          const cforms = await checkForms(cpage);
          console.log(`    Contact page Forms found: ${cforms.length}`);
          for (const f of cforms) {
            console.log(`     Form #${f.formIdx} id="${f.id}" class="${f.className}" action="${f.action}"`);
            console.log(`       Inputs: ${f.inputs.map(inp => `${inp.tag}[name=${inp.name}, type=${inp.type}, id=${inp.id}]`).join(', ')}`);
          }
          await cpage.close();
        } catch (e) {
          console.log(`    Failed to check contact link ${cl.href}: ${e.message}`);
        }
        break; // only first valid contact link
      }
    }

  } catch (err) {
    console.log(`  Exception: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  for (const lead of leads) {
    await inspectLead(lead);
  }
}

main();
