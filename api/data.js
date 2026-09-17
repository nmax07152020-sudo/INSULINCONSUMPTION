const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsk9DyhY64CSWu2h7z69Hjj8jGeeHUYwFASryu4Zfu009UIeCJuCMHTgBTDUUcBPXazA/exec';

export default async function handler(req, res) {
  try {
    const params = new URLSearchParams(req.query || {});
    params.delete('callback');

    const target = `${SCRIPT_URL}?${params.toString()}`;
    const response = await fetch(target, { redirect: 'follow' });
    const text = await response.text();

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET') {
      res.status(response.status).setHeader('Content-Type', 'application/json; charset=utf-8');
      // Apps Script may return JSONP when a callback was supplied by an older client.
      // Normalize callback-wrapped JSON to plain JSON for the same-origin frontend.
      const clean = text.replace(/^\s*[A-Za-z_$][\w$\.]*\s*\(\s*/, '').replace(/\s*\)\s*;?\s*$/, '');
      try {
        JSON.parse(clean);
        return res.send(clean);
      } catch (_) {
        return res.status(response.status).send(JSON.stringify({success:false,message:'Invalid Apps Script response',raw:text.slice(0,1000)}));
      }
    }

    res.status(response.status).setHeader('Content-Type', response.headers.get('content-type') || 'text/html; charset=utf-8');
    return res.send(text);
  } catch (err) {
    res.status(502).json({success:false,message:'Vercel proxy could not reach Google Apps Script.',error:String(err && err.message || err)});
  }
}
