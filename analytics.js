/* =====================================================================
   Google Analytics — counts visitors and every button they press.

   HOW TO SWITCH IT ON
   1. Go to analytics.google.com → Admin → Create → Property
      (name: Haider Portfolio) → add a "Web" data stream for
      https://haiderportfolio.online
   2. Copy the Measurement ID (looks like G-AB12CD34EF).
   3. Paste it between the quotes on the GA_ID line below.
   4. Run:  bash /Users/haider/Projects/portfolio-site/deploy.sh

   While GA_ID is empty this file does nothing at all.

   WHAT IT COUNTS (Reports → Engagement → Events)
     page_view            every visit (automatic, with where they came from)
     whatsapp_click       any WhatsApp button          + place on the page
     email_click          tapping the email address    + place
     email_copy           the "Copy email" button
     instagram_click      any Instagram link           + place
     free_plan_click      "Get a free plan" / "Let's talk" / corner button
     quiz_open            the "Which one are you?" popup opened (auto or tapped)
     quiz_answer          which answer was picked
     quiz_submit          popup sent to WhatsApp       ┐ both also count as
     lead_form_submit     lead form sent to WhatsApp   ┘ generate_lead
     project_open         a project's details opened   + which project
     visit_site_click     a "Visit site" link          + which site
     button_click         any other button or menu link + its label

   No names, phone numbers or messages are ever sent — only which button.
   ===================================================================== */
(function () {
  'use strict';

  var GA_ID = ''; // ← paste your Google Analytics Measurement ID here (G-XXXXXXXXXX)

  if (!GA_ID) return;

  // --- Google's standard loader ---
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  var ev = function (name, params) { try { gtag('event', name, params || {}); } catch (e) {} };

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
    var href = (el.getAttribute('href')) || '';
    var place = placeOf(el);

    if (href.indexOf('wa.me') !== -1) return ev('whatsapp_click', { place: place });
    if (href.indexOf('mailto:') === 0) return ev('email_click', { place: place });
    if (el.id === 'copyBtn') return ev('email_copy', { place: place });
    if (href.indexOf('instagram.com') !== -1) return ev('instagram_click', { place: place });
    if (el.hasAttribute('data-quiz')) return ev('free_plan_click', { place: place, label: labelOf(el) });
    if (el.classList.contains('who__chip') || el.classList.contains('quiz__opt')) return; // counted as quiz_answer below

    var open = el.getAttribute('data-open') || (el.classList.contains('tile') && el.getAttribute('data-id'));
    if (open) return ev('project_open', { project: open, place: place });

    if (el.tagName === 'A' && /^https?:/.test(href) && el.getAttribute('target') === '_blank') {
      return ev('visit_site_click', { site: href.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], place: place });
    }
    if (el.type === 'submit' && el.closest('form')) return; // real form buttons: counted as lead_form_submit / quiz_submit below
    ev('button_click', { label: labelOf(el) || href, place: place });
  }, true);

  // --- Lead form and popup (main.js announces these) ---
  document.addEventListener('lead:submit', function (e) {
    var need = (e.detail && e.detail.need) || '';
    ev('lead_form_submit', { need: need });
    ev('generate_lead', { lead_source: 'lead form', need: need });
  });
  document.addEventListener('quiz:step', function (e) {
    var d = e.detail || {};
    if (d.step === 'open') ev('quiz_open', { how: d.id });           // auto · button · chip
    else if (d.step === 'segment') ev('quiz_answer', { answer: d.id });
    else if (d.step === 'submit') { ev('quiz_submit', { answer: d.id }); ev('generate_lead', { lead_source: 'popup', need: d.id }); }
  });

  // --- Tell visitors ---
  document.addEventListener('DOMContentLoaded', function () {
    var row = document.querySelector('.foot__row');
    if (!row) return;
    var note = document.createElement('span');
    note.textContent = 'Visits are counted with Google Analytics.';
    row.appendChild(note);
  });
})();
