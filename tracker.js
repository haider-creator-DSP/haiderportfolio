/* =====================================================================
   My own visitor counter + lead saver. Feeds the private dashboard at
   https://haider-leads.vercel.app  (login is in
   /Users/haider/Projects/haider-leads/ADMIN-LOGIN.txt)

   WHAT IT SENDS
     visit   once per browser session: where they came from, screen width
     event   which button was pressed and where on the page
     lead    ONLY when someone presses Send on the form or the popup:
             the name, number, email, need and message they typed

   WHAT IT NEVER DOES
     - nothing typed is sent until the visitor presses Send
     - no cookies; visitors are anonymous random ids until they send details
     - anonymous counting is skipped for browsers that ask not to be tracked

   DON'T COUNT YOURSELF
     open https://haiderportfolio.online/?me=1 once on each of your devices.
     (?me=0 turns counting back on.)
   ===================================================================== */
(function () {
  'use strict';

  var ENDPOINT = 'https://haider-leads.vercel.app/api/collect';

  var get = function (s, k) { try { return s.getItem(k); } catch (e) { return null; } };
  var set = function (s, k, v) { try { s.setItem(k, v); } catch (e) {} };
  var qs = new URLSearchParams(location.search);
  if (qs.get('me') === '1') set(localStorage, 'hp-me', '1');
  if (qs.get('me') === '0') { try { localStorage.removeItem('hp-me'); } catch (e) {} }
  if (get(localStorage, 'hp-me') === '1') return;                       // my own device
  if (!/^https?:$/.test(location.protocol)) return;

  var id = function () {
    var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  };
  var sid = get(sessionStorage, 'hp-sid'), fresh = !sid;
  if (!sid) { sid = id(); set(sessionStorage, 'hp-sid', sid); }
  var vid = get(localStorage, 'hp-vid');
  if (!vid) { vid = id(); set(localStorage, 'hp-vid', vid); }

  var quiet = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  var send = function (body) {
    body.sid = sid; body.vid = vid;
    var json = JSON.stringify(body);
    try {
      // text/plain keeps this a "simple" request, so it still goes out while the page is closing or WhatsApp is opening
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([json], { type: 'text/plain' }))) return;
      fetch(ENDPOINT, { method: 'POST', body: json, headers: { 'Content-Type': 'text/plain' }, keepalive: true, credentials: 'omit' }).catch(function () {});
    } catch (e) {}
  };
  var ev = function (name, place, label) { if (!quiet) send({ t: 'event', name: name, place: place || '', label: label || '' }); };

  if (fresh && !quiet) {
    send({ t: 'visit', ref: document.referrer || '', utm_source: qs.get('utm_source') || (qs.get('ttclid') ? 'tiktok' : ''), utm_medium: qs.get('utm_medium') || '',
      utm_campaign: qs.get('utm_campaign') || '', landing: location.pathname, w: window.innerWidth, lang: navigator.language || '' });
  }

  // Where on the page did it happen? (first match wins)
  var PLACES = [
    ['.wa-float', 'floating WhatsApp button'], ['.quiz-pill', 'corner button'], ['.quiz', 'popup'],
    ['.case', 'project details'], ['.lead', 'lead form'], ['.nav', 'top menu'], ['.menu', 'phone menu'],
    ['.hero', 'top of page'], ['.me__card', 'about card'], ['.band', 'which-one-are-you block'],
    ['.panel', 'live slides'], ['.dsh-sec', 'dashboards'], ['.windex', 'index of work'],
    ['.contact', 'contact section'], ['.foot', 'footer'], ['.work', 'gallery'],
  ];
  var placeOf = function (el) {
    for (var i = 0; i < PLACES.length; i++) if (el.closest(PLACES[i][0])) return PLACES[i][1];
    return 'page';
  };
  var labelOf = function (el) {
    return (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button, .tile');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    var place = placeOf(el);

    if (href.indexOf('wa.me') !== -1) return ev('whatsapp_click', place);
    if (href.indexOf('mailto:') === 0) return ev('email_click', place);
    if (el.id === 'copyBtn') return ev('email_copy', place);
    if (href.indexOf('instagram.com') !== -1) return ev('instagram_click', place);
    if (el.hasAttribute('data-quiz')) return ev('free_plan_click', place, labelOf(el));
    if (el.classList.contains('who__chip') || el.classList.contains('quiz__opt')) return; // counted as quiz_answer below

    var open = el.getAttribute('data-open') || (el.classList.contains('tile') && el.getAttribute('data-id'));
    if (open) return ev('project_open', place, open);

    if (el.tagName === 'A' && /^https?:/.test(href) && el.getAttribute('target') === '_blank') {
      return ev('visit_site_click', place, href.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]);
    }
    if (el.type === 'submit' && el.closest('form')) return; // counted as lead_form_submit / quiz_submit below
    ev('button_click', place, labelOf(el) || href);
  }, true);

  // --- Lead form and popup (main.js announces these) ---
  document.addEventListener('lead:submit', function (e) { ev('lead_form_submit', 'lead form', (e.detail && e.detail.need) || ''); });
  document.addEventListener('quiz:step', function (e) {
    var d = e.detail || {};
    if (d.step === 'open') ev('quiz_open', d.id);                // auto · button · chip
    else if (d.step === 'segment') ev('quiz_answer', 'popup', d.id);
    else if (d.step === 'submit') ev('quiz_submit', 'popup', d.id);
  });
  // The visitor pressed Send: save what they typed so I can reply even if they never press send inside WhatsApp.
  document.addEventListener('lead:data', function (e) {
    var d = e.detail || {};
    send({ t: 'lead', source: d.source || '', name: d.name || '', phone: d.phone || '', email: d.email || '', need: d.need || '', message: d.message || '' });
  });
})();
