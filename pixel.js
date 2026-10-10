/* =====================================================================
   TikTok Pixel — measures visits and contacts that come from TikTok ads.

   HOW TO SWITCH IT ON
   1. In TikTok Ads Manager: Tools → Events → Web Events → Create Pixel
      → "Manual setup". Copy the Pixel ID (looks like C4ABCDE1234567890XYZ).
   2. Paste it between the quotes on the PIXEL_ID line below.
   3. Run:  bash /Users/haider/Projects/portfolio-site/deploy.sh

   While PIXEL_ID is empty this file does nothing at all.

   WHAT IT REPORTS
   - PageView     every visit (automatic)
   - Contact      taps on WhatsApp, the email address or "Copy email"
                  ← the event to optimise ads for
   - ViewContent  opening a project's details
   - ClickButton  taps on Instagram or a "Visit site" button
   ===================================================================== */
(function () {
  'use strict';

  var PIXEL_ID = 'DB4QGQJC77U074LG1RCG'; // TikTok Pixel ID (TikTok Ads Manager → Tools → Events)

  if (!PIXEL_ID) return;

  // --- TikTok's standard loader (from TikTok Ads Manager, unchanged) ---
  !function (w, d, t) {
    w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
    ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
    ttq.load = function (e, n) {
      var r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
      ttq._t = ttq._t || {}; ttq._t[e] = +new Date();
      ttq._o = ttq._o || {}; ttq._o[e] = n || {};
      var s = d.createElement('script'); s.type = 'text/javascript'; s.async = true; s.src = r + '?sdkid=' + e + '&lib=' + t;
      var f = d.getElementsByTagName('script')[0]; f.parentNode.insertBefore(s, f);
    };
    ttq.load(PIXEL_ID);
    ttq.page();
  }(window, document, 'ttq');

  var ttq = window.ttq;
  var send = function (event, name) {
    try { ttq.track(event, { content_type: 'product', content_id: name, content_name: name }); } catch (e) {}
  };

  // --- Events: one listener for the whole page ---
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button, .tile');
    if (!el) return;
    var href = (el.getAttribute && el.getAttribute('href')) || '';

    if (href.indexOf('wa.me') !== -1) return send('Contact', 'WhatsApp');
    if (href.indexOf('mailto:') === 0 || el.id === 'copyBtn') return send('Contact', 'Email');
    if (href.indexOf('instagram.com') !== -1) return send('ClickButton', 'Instagram');

    var open = el.getAttribute('data-open') || (el.classList.contains('tile') && el.getAttribute('data-id'));
    if (open) return send('ViewContent', open);

    if (el.tagName === 'A' && /^https?:/.test(href) && el.getAttribute('target') === '_blank') {
      return send('ClickButton', 'Visit ' + href.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]);
    }
  }, true);

  // --- Tell visitors, once the pixel is actually running ---
  document.addEventListener('DOMContentLoaded', function () {
    var row = document.querySelector('.foot__row');
    if (!row) return;
    var note = document.createElement('span');
    note.textContent = 'This site measures ad visits with the TikTok Pixel.';
    row.appendChild(note);
  });
})();
