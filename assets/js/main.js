/* FLUSSOVIA – progressive enhancement. The site is fully readable without JavaScript. */
(function () {
  'use strict';
  var LANG_KEY = 'flussovia-lang';

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---- Language: remember explicit choice, keep hash/query when switching ---- */
  var current = document.documentElement.lang;
  if (current === 'en' || current === 'it') {
    // Remember the language the visitor is browsing in, so the root URL (/) reopens it.
    store(LANG_KEY, current);
  }
  document.querySelectorAll('a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      store(LANG_KEY, a.getAttribute('data-lang'));
      a.href = a.getAttribute('href').split(/[?#]/)[0] + location.search + location.hash;
    });
  });

  /* ---- Mobile navigation ---- */
  var toggle = document.querySelector('[data-nav-toggle]');
  var panel = document.getElementById('site-nav');
  if (toggle && panel) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
    });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  }

  /* ---- Catalogue filter ---- */
  var filters = document.querySelector('[data-filters]');
  if (filters) {
    var chips = Array.prototype.slice.call(filters.querySelectorAll('[data-filter]'));
    var families = Array.prototype.slice.call(document.querySelectorAll('.family'));
    var status = document.querySelector('[data-filter-status]');
    var apply = function (id, updateHash) {
      var shown = 0;
      families.forEach(function (f) {
        var on = id === 'all' || f.getAttribute('data-family') === id;
        f.hidden = !on;
        if (on) shown += f.querySelectorAll('.card').length;
      });
      chips.forEach(function (c) {
        var active = c.getAttribute('data-filter') === id;
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-pressed', String(active));
      });
      if (status) status.textContent = status.dataset.showing + ' ' + shown + ' ' + status.dataset.of + ' 20 ' + status.dataset.word;
      if (updateHash && history.replaceState) {
        history.replaceState(null, '', id === 'all' ? location.pathname + location.search : '#' + id);
      }
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-filter'), true); }); });
    var fromHash = function () {
      var id = decodeURIComponent(location.hash.slice(1));
      var match = chips.some(function (c) { return c.getAttribute('data-filter') === id; });
      if (match) { apply(id, false); }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
  }

  /* ---- Poster viewer (native <dialog>) ---- */
  var dialog = document.getElementById('poster-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    var opener = null;
    var zoomBtn = dialog.querySelector('[data-poster-zoom]');
    var img = dialog.querySelector('img');
    var setZoom = function (full) {
      dialog.classList.toggle('is-full', full);
      zoomBtn.setAttribute('aria-pressed', String(full));
      zoomBtn.textContent = full ? zoomBtn.dataset.labelOut : zoomBtn.dataset.labelIn;
    };
    document.querySelectorAll('[data-poster-open]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        opener = el; setZoom(false);
        dialog.showModal(); document.body.classList.add('dialog-open');
      });
    });
    var close = function () { dialog.close(); };
    dialog.addEventListener('close', function () {
      document.body.classList.remove('dialog-open');
      if (opener) opener.focus();
    });
    dialog.querySelector('[data-poster-close]').addEventListener('click', close);
    zoomBtn.addEventListener('click', function () { setZoom(!dialog.classList.contains('is-full')); });
    img.addEventListener('click', function () { setZoom(!dialog.classList.contains('is-full')); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
  }

  /* ---- Quote form ---- */
  var form = document.querySelector('[data-quote-form]');
  if (form) {
    var cfg = JSON.parse(document.getElementById('form-i18n').textContent);
    var msg = form.querySelector('[data-form-msg]');
    var submit = form.querySelector('button[type="submit"]');
    var select = form.elements.pump;

    // Preselect pump from ?pump=slug
    var wanted = new URLSearchParams(location.search).get('pump');
    if (wanted && select && Array.prototype.some.call(select.options, function (o) { return o.value === wanted; })) select.value = wanted;

    var setMsg = function (html, kind) {
      msg.className = 'form__msg' + (kind ? ' is-' + kind : '');
      msg.innerHTML = html || '';
    };
    var escHtml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

    var pumpLabel = function () {
      if (!select || !select.value) return '';
      if (select.value === 'other') return cfg.unsure;
      return select.options[select.selectedIndex].text;
    };
    var mailtoHref = function (d) {
      var L = cfg.labels;
      var lines = [cfg.greeting, '', L.name + ': ' + d.name, L.company + ': ' + (d.company || '-'), L.email + ': ' + d.email,
        L.pump + ': ' + (d.pumpLabel || '-'), '', L.details + ':', d.details, '', '— ' + d.name];
      return 'mailto:' + cfg.email + '?subject=' + encodeURIComponent(cfg.subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setMsg('');
      // validation with native messages in the page language
      var bad = [];
      ['name', 'email', 'details'].forEach(function (n) {
        var el = form.elements[n];
        var ok = el.value.trim() && el.checkValidity();
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) bad.push(el);
      });
      if (bad.length) { bad[0].focus(); bad[0].reportValidity && bad[0].reportValidity(); return; }
      if (form.elements.website && form.elements.website.value) return; // honeypot

      var data = {
        name: form.elements.name.value.trim(), company: form.elements.company.value.trim(),
        email: form.elements.email.value.trim(), pump: select.value, pumpLabel: pumpLabel(),
        details: form.elements.details.value.trim(), language: cfg.lang
      };

      if (cfg.endpoint) {
        submit.disabled = true; setMsg(escHtml(cfg.sending));
        fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); setMsg(escHtml(cfg.success), 'ok'); })
          .catch(function () { setMsg(escHtml(cfg.error) + ' <a href="' + escHtml(mailtoHref(data)) + '">' + escHtml(cfg.mailtoLink) + '</a>', 'error'); })
          .then(function () { submit.disabled = false; });
      } else {
        var href = mailtoHref(data);
        setMsg(escHtml(cfg.mailtoOpened) + ' <a href="' + escHtml(href) + '">' + escHtml(cfg.mailtoLink) + '</a>', 'ok');
        window.location.href = href;
      }
    });
  }
})();
