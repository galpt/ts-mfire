import puppeteer from 'puppeteer';

export async function fetchVrfWithBrowserFallback(q: string, timeoutMs = 20000): Promise<string> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    let vrf = '';
    await page.setRequestInterception(true);
    page.on('request', (req: any) => { req.continue().catch(() => {}); });
    page.on('requestfinished', async (req: any) => {
      try {
        const url = req.url();
        if (url.includes('ajax/manga/search') || url.includes('/filter?')) {
          const u = new URL(url);
          const v = u.searchParams.get('vrf');
          if (v) vrf = v;
        }
      } catch (e) { /* ignore */ }
    });
    await page.goto('https://mangafire.to/home', { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // inject query to trigger client-side request
    await page.evaluate((q) => {
      const el = document.querySelector('.search-inner input[name=keyword]');
      if (!el) return false;
      (el as HTMLInputElement).value = q;
      el.dispatchEvent(new Event('keyup'));
      return true;
    }, q);
    const start = Date.now();
    while (!vrf && Date.now() - start < timeoutMs) {
      // wait a bit
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200));
    }
    return vrf || '';
  } finally {
    try { await browser.close(); } catch (e) { }
  }
}
