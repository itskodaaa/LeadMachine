import puppeteer from 'puppeteer';

const leads = [
  { id: 3036, name: "Allred's Corporation", url: 'https://generalcontractor.expert' },
  { id: 3038, name: "Premier General Builders", url: 'https://premiergeneralbuilders.com' },
  { id: 3039, name: "LaVie Construction Inc", url: 'https://lavieconstruction.com' },
  { id: 3040, name: "Lio James construction", url: 'https://liojamesconstruction.com' }
];

async function inspect() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  for (const lead of leads) {
    const page = await browser.newPage();
    try {
      console.log(`Checking ${lead.id} ${lead.name} at ${lead.url}...`);
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            text: el.innerText || el.value
          }))
        }));
      });
      console.log(`Lead ${lead.id} forms found: ${forms.length}`);
      console.log(JSON.stringify(forms, null, 2));
    } catch (e) {
      console.error(`Error on ${lead.id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

inspect();
