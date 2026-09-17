const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsk9DyhY64CSWu2h7z69Hjj8jGeeHUYwFASryu4Zfu009UIeCJuCMHTgBTDUUcBPXazA/exec';

export default async function handler(req, res) {
  try {
    const method = (req.method || 'GET').toUpperCase();
    const incoming = new URL(req.url, 'https://vercel.local');
    const params = new URLSearchParams(incoming.search);
    params.delete('callback');

    let targetUrl;
    let fetchOptions = { redirect: 'follow' };

    if (method === 'POST') {
      // Preserve the form POST used by Patient Entry / Edit.
      // Vercel receives the form fields in req.body and forwards them
      // to the Apps Script doPost() endpoint instead of converting the
      // request into an api=1 read request.
      const body = req.body || {};
      const form = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach(v => form.append(key, String(v ?? '')));
        else form.append(key, String(value ?? ''));
      });
      if (!form.get('action')) form.set('action', params.get('action') || 'savePatient');
      targetUrl = SCRIPT_URL;
      fetchOptions.method = 'POST';
      fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' };
      fetchOptions.body = form.toString();
    } else {
      // Dashboard read endpoint.
      params.set('api', '1');
      targetUrl = `${SCRIPT_URL}?${params.toString()}`;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const text = await response.text();

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (method === 'GET') {
      res.status(response.status).setHeader('Content-Type', 'application/json; charset=utf-8');
      const clean = text.replace(/^\s*[A-Za-z_$][\w$\.]*\s*\(\s*/, '').replace(/\s*\)\s*;?\s*$/, '');
      try {
        JSON.parse(clean);
        return res.send(clean);
      } catch (_) {
        return res.status(response.status).send(JSON.stringify({success:false,message:'Invalid Apps Script response',raw:text.slice(0,1000)}));
      }
    }

    res.status(response.status).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(text);
  } catch (err) {
    res.status(502).json({success:false,message:'Vercel proxy could not reach Google Apps Script.',error:String(err && err.message || err)});
  }
}
