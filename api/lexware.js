export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Nur POST erlaubt.' });
  }

  try {
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Bitte erneut anmelden.' });

    const supabaseUrl = String(process.env.SUPABASE_URL || 'https://dbaiwcqoigqgknmtctwl.supabase.co').trim();
    const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: auth }
    });
    const user = await userResp.json().catch(() => ({}));
    if (!userResp.ok || !user?.id) return res.status(401).json({ error: 'Anmeldung ist abgelaufen.' });

    const body = req.body || {};
    const action = String(body.action || '').trim();
    const lexwareKey = String(body.lexwareKey || '').trim();
    if (!lexwareKey) return res.status(400).json({ error: 'Lexware API-Key fehlt.' });

    const api = async (path, options = {}) => {
      const r = await fetch(`https://api.lexware.io${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${lexwareKey}`,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });
      const text = await r.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!r.ok) {
        const msg = data?.message || data?.error || data?.reason || `Lexware Fehler ${r.status}`;
        const err = new Error(msg);
        err.status = r.status;
        err.details = data;
        throw err;
      }
      return data;
    };

    if (action === 'profile') {
      const profile = await api('/v1/profile');
      return res.status(200).json({ ok: true, profile: {
        organizationId: profile.organizationId,
        companyName: profile.companyName,
        userName: profile.userName,
        userEmail: profile.userEmail,
        connectionId: profile.connectionId
      }});
    }

    if (action === 'createContact') {
      const c = body.customer || {};
      const name = String(c.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Kundenname fehlt.' });

      const cityRaw = String(c.city || '').trim();
      const m = cityRaw.match(/^(\d{5})\s+(.+)$/);
      const billing = {
        street: String(c.street || '').trim(),
        zip: m ? m[1] : '',
        city: m ? m[2] : cityRaw,
        countryCode: 'DE'
      };

      const payload = {
        version: 0,
        roles: { customer: {} },
        company: {
          name,
          ...(String(c.contact_person || '').trim() ? {
            contactPersons: [{
              lastName: String(c.contact_person).trim(),
              primary: true,
              ...(c.email ? { emailAddress: String(c.email).trim() } : {}),
              ...(c.phone ? { phoneNumber: String(c.phone).trim() } : {})
            }]
          } : {})
        },
        ...(c.street || c.city ? { addresses: { billing: [billing] } } : {}),
        ...(c.email ? { emailAddresses: { business: [String(c.email).trim()] } } : {}),
        ...(c.phone ? { phoneNumbers: { business: [String(c.phone).trim()] } } : {}),
        ...(c.note ? { note: String(c.note).trim() } : {})
      };

      const result = await api('/v1/contacts', { method: 'POST', body: JSON.stringify(payload) });
      return res.status(200).json({ ok: true, contact: result });
    }

    if (action === 'createInvoice') {
      const d = body.document || {};
      const c = body.customer || {};
      const vat = Number(d.vat ?? 19);
      const positions = Array.isArray(d.positions) ? d.positions : [];
      if (!String(c.name || '').trim()) return res.status(400).json({ error: 'Kunde fehlt.' });
      if (!positions.length) return res.status(400).json({ error: 'Rechnungspositionen fehlen.' });

      const cityRaw = String(c.city || '').trim();
      const m = cityRaw.match(/^(\d{5})\s+(.+)$/);
      const date = String(d.date || new Date().toISOString().slice(0, 10));
      const iso = `${date}T00:00:00.000+02:00`;
      const payload = {
        voucherDate: iso,
        address: {
          name: String(c.name).trim(),
          ...(c.street ? { street: String(c.street).trim() } : {}),
          ...(m ? { zip: m[1], city: m[2] } : (cityRaw ? { city: cityRaw } : {})),
          countryCode: 'DE'
        },
        lineItems: positions.map((p, i) => ({
          type: 'custom',
          name: String(p.desc || `Position ${i + 1}`).trim(),
          quantity: Number(p.qty || 1),
          unitName: String(p.unit || 'Stück'),
          unitPrice: {
            currency: 'EUR',
            netAmount: Number(p.price || 0),
            taxRatePercentage: vat
          },
          discountPercentage: 0
        })),
        totalPrice: { currency: 'EUR' },
        taxConditions: { taxType: 'net' },
        shippingConditions: { shippingType: 'service', shippingDate: iso },
        title: 'Rechnung',
        introduction: String(d.subject || 'Für die ausgeführten Leistungen berechnen wir:'),
        remark: String(d.note || 'Vielen Dank für Ihren Auftrag.')
      };

      const finalize = body.finalize === true ? '?finalize=true' : '';
      const result = await api(`/v1/invoices${finalize}`, { method: 'POST', body: JSON.stringify(payload) });
      return res.status(200).json({ ok: true, invoice: result });
    }

    return res.status(400).json({ error: 'Unbekannte Aktion.' });
  } catch (e) {
    console.error('Lexware bridge error', e?.status || '', e?.message || e);
    return res.status(e?.status && e.status < 500 ? e.status : 502).json({
      error: e?.message || 'Lexware konnte nicht erreicht werden.'
    });
  }
}
