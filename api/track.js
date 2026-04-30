var ALLOWED_EVENTS = [
  'app_open', 'tab_click', 'scan_ticket', 'scan_success',
  'reminder_added', 'profile_saved', 'report_created',
  'magic_link_sent', 'gps_started', 'share_ticket',
  'dispute_generated', 'true_cost_calc', 'expert_contact',
  'user_feedback'
];

// Only these events trigger a Telegram notification — everything else just goes to Supabase
var TELEGRAM_EVENTS = [
  'magic_link_sent',
  'scan_success',
  'report_created',
  'dispute_generated',
  'expert_contact',
  'user_feedback',
  'true_cost_calc'
];

var ICONS = {
  'magic_link_sent':   '✉️',
  'scan_success':      '📸',
  'report_created':    '📍',
  'dispute_generated': '⚖️',
  'expert_contact':    '👨‍💼',
  'user_feedback':     '💬',
  'true_cost_calc':    '🧮'
};

var LABELS = {
  'magic_link_sent':   'New user signed in',
  'scan_success':      'Ticket scanned',
  'report_created':    'Community report filed',
  'dispute_generated': 'Dispute script generated',
  'expert_contact':    'Expert contacted',
  'user_feedback':     'User left feedback',
  'true_cost_calc':    'True Cost calculated'
};

var ALLOWED_ORIGINS = [
  'https://drivee.ca',
  'https://www.drivee.ca',
  'http://localhost',
  'http://127.0.0.1'
];

// Simple in-memory rate limiter (resets on cold start, ~5min on Vercel)
var rateLimitMap = {};
var RATE_LIMIT = 30; // max requests per IP per minute

function isRateLimited(ip) {
  var now = Date.now();
  if (!rateLimitMap[ip] || rateLimitMap[ip].reset < now) {
    rateLimitMap[ip] = { count: 1, reset: now + 60000 };
    return false;
  }
  rateLimitMap[ip].count++;
  return rateLimitMap[ip].count > RATE_LIMIT;
}

async function getCityFromIp(ip) {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') return null;
  try {
    var cleanIp = ip.split(',')[0].trim();
    var r = await fetch('https://ipinfo.io/' + cleanIp + '/json', {
      signal: AbortSignal.timeout(1500)
    });
    var d = await r.json();
    if (d.city && d.region) return d.city + ', ' + d.region;
    return d.city || null;
  } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  var origin = req.headers.origin || req.headers.referer || '';
  var allowed = ALLOWED_ORIGINS.some(function(o) { return origin.indexOf(o) === 0; });

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  var event = String(req.body.event || '').substring(0, 50);
  var meta  = String(req.body.meta  || '').substring(0, 200);

  if (ALLOWED_EVENTS.indexOf(event) === -1) {
    return res.status(400).json({ error: 'Unknown event' });
  }

  meta = meta.replace(/<[^>]*>/g, '');

  // Save to Supabase — all events
  var supabaseUrl = process.env.SUPABASE_URL || 'https://ofnsssyiiejohcnbejxq.supabase.co';
  var supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (supabaseKey) {
    try {
      await fetch(supabaseUrl + '/rest/v1/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey
        },
        body: JSON.stringify({ event: event, meta: meta })
      });
    } catch (e) {}
  }

  // Telegram — only for meaningful events
  if (TELEGRAM_EVENTS.indexOf(event) !== -1) {
    var botToken = process.env.TELEGRAM_BOT_TOKEN;
    var chatId   = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      var city  = await getCityFromIp(ip);
      var icon  = ICONS[event]  || '📊';
      var label = LABELS[event] || event.replace(/_/g, ' ');
      var ts    = new Date().toLocaleString('en-CA', {
        timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short'
      });

      var lines = [icon + ' ' + label];
      if (meta) lines.push('ℹ️ ' + meta);
      if (city) lines.push('📍 ' + city);
      lines.push('🕐 ' + ts);

      try {
        await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') })
        });
      } catch (e) {}
    }
  }

  res.status(200).json({ ok: true });
};
