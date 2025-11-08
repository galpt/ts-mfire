import * as cheerio from 'cheerio';
import { GenerateVrf } from './vrf.js';
import { MangaImpl } from './models.js';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
  'Referer': 'https://mangafire.to/'
};

export class Client {
  headers: Record<string, string>;
  constructor() { this.headers = { ...DEFAULT_HEADERS }; }

  getFetch(): typeof fetch {
    if (typeof globalThis.fetch === 'function') return globalThis.fetch.bind(globalThis) as unknown as typeof fetch;
    throw new Error('global fetch is not available. Please run on Node 18+ or install node-fetch');
  }

  async fetchDocument(url: string) {
    const res = await this.getFetch()(url, { headers: this.headers } as any);
    if (!res.ok) throw new Error(`bad status: ${res.status} ${res.statusText}`);
    const body = await res.text();
    return cheerio.load(body);
  }

  async FetchHome(limit = 10) {
    const $ = await this.fetchDocument('https://mangafire.to/home');
    const mangas: MangaImpl[] = [];
  $('.original.card-lg .unit .inner').each((i: number, el: any) => {
      if (mangas.length >= limit) return;
      const a = $(el).find('.info > a').first();
      const title = a.text().trim();
      let href = a.attr('href') || '';
      const cover = $(el).find('img').attr('src') || '';
      if (href && !/^https?:\/\//.test(href)) href = 'https://mangafire.to' + href;
      mangas.push(new MangaImpl(title, href, cover));
    });
    return mangas;
  }

  async Search(query: string, limit = 10) {
    const qTrim = query.trim();
    try { await this.fetchDocument('https://mangafire.to/filter'); } catch (e) { }
    const parts = qTrim.split(/\s+/).map(encodeURIComponent).join('+');
    const vrf = GenerateVrf(qTrim);
    const searchUrl = `https://mangafire.to/filter?keyword=${parts}&vrf=${encodeURIComponent(vrf)}`;
    const res = await this.getFetch()(searchUrl, { headers: { ...this.headers, Referer: 'https://mangafire.to/filter' } } as any);
    if (res.status === 403) {
      console.warn('[client] search returned 403; attempting browser fallback to obtain vrf token');
      try {
        // Dynamically import the browser fallback helper if available. Use ts-ignore
        // to avoid in-editor type complaints about this local module.
        // @ts-ignore
        console.debug('[client] importing browser-fallback helper');
        const mod: any = await import('./browser-fallback.js');
        console.debug('[client] browser-fallback module imported');
        const browserVrf = await mod.fetchVrfWithBrowserFallback(qTrim, 20000);
        // Log exact returned value and length so we can correlate with browser-fallback logs
        try {
          const _v = browserVrf;
          console.debug('[client] browser fallback returned (json):', JSON.stringify({ vrf: _v }));
          console.debug('[client] browser fallback returned (len):', _v ? String(_v).length : 0);
        } catch (logErr) {
          console.debug('[client] browser fallback returned (fallback log error):', String(logErr));
        }
        if (browserVrf) {
          const retryUrl = `https://mangafire.to/filter?keyword=${parts}&vrf=${encodeURIComponent(browserVrf)}`;
          console.debug('[client] retrying search with browser vrf token');
          const res2 = await this.getFetch()(retryUrl, { headers: { ...this.headers, Referer: 'https://mangafire.to/filter' } } as any);
          console.debug('[client] retry response status:', res2.status);
          if (!res2.ok) {
            const text = await res2.text().catch(() => '<no-body>');
            console.warn('[client] retry failed with status', res2.status, 'body snippet:', String(text).slice(0, 300));
            throw new Error(`bad status: ${res2.status}`);
          }
          const body2 = await res2.text();
          const $2 = cheerio.load(body2);
          return parseMangasFromDoc($2, limit);
        } else {
          console.warn('[client] browser fallback did not return a vrf token');
        }
      } catch (e: any) {
        console.error('[client] browser fallback error:', e && e.message ? e.message : e);
      }
      throw new Error('search request returned 403');
    }
    if (!res.ok) throw new Error(`bad status: ${res.status}`);
    const body = await res.text();
    const $ = cheerio.load(body);
    return parseMangasFromDoc($, limit);
  }
}

function parseMangasFromDoc($: any, limit: number) {
  const mangas: MangaImpl[] = [];
  $('.original.card-lg .unit .inner').each((i: number, el: any) => {
    if (mangas.length >= limit) return;
    const a = $(el).find('.info > a').first();
    const title = a.text().trim();
    let href = a.attr('href') || '';
    const cover = $(el).find('img').attr('src') || '';
    if (href && !/^https?:\/\//.test(href)) href = 'https://mangafire.to' + href;
    mangas.push(new MangaImpl(title, href, cover));
  });
  return mangas;
}

export function NewClient() { return new Client(); }
