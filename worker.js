// Cloudflare Worker (مجاني: 100 ألف طلب يوميًا) — يجلب title و meta description
// ضع دومين موقعك في ALLOW لتمنع الغير من استخدام الـ Worker، مثال: 'mysite.com'
const ALLOW = '';

const dec = s => s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');

export default {
  async fetch(req) {
    const h = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json;charset=utf-8'};
    const u = new URL(req.url).searchParams.get('url') || '';
    let host = '';
    try { host = new URL(u).hostname } catch (e) {}
    if (!/^https?:\/\//.test(u) || (ALLOW && !host.endsWith(ALLOW))) return new Response('{}', {status:400, headers:h});
    try {
      const r = await fetch(u, {headers:{'User-Agent':'Mozilla/5.0 (compatible; SEOTitleBot/1.0)','Accept-Language':'ar,en;q=0.8'}, redirect:'follow'});
      const t = (await r.text()).slice(0, 300000);
      const g = re => { const m = t.match(re); return m ? dec(m[1].replace(/\s+/g,' ').trim()) : '' };
      return new Response(JSON.stringify({
        title: g(/<title[^>]*>([\s\S]*?)<\/title>/i),
        desc: g(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i) || g(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)
      }), {headers:h});
    } catch (e) { return new Response('{}', {headers:h}) }
  }
};
