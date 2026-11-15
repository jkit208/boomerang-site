/* Boomerang site behavior: nav, calculator, demo player, Trust Dial. No dependencies. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- mobile nav ----------
  var tog = $('.menu-toggle');
  if (tog) tog.addEventListener('click', function () {
    var ul = $('.nav ul'); var open = ul.classList.toggle('open');
    tog.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // ---------- calculator ----------
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  $$('[data-calc]').forEach(function (calc) {
    var plan = Number(calc.getAttribute('data-plan-price')) || 297;
    var get = function (k) { return Number($('[name=' + k + ']', calc).value); };
    function update() {
      ['missed', 'value', 'close', 'recover'].forEach(function (k) {
        var o = $('output[for=' + k + ']', calc), v = get(k);
        if (o) o.textContent = k === 'value' ? money(v) : (k === 'missed' ? v : v + '%');
      });
      var lostMonth = get('missed') * 4.33 * get('value') * (get('close') / 100);
      var recMonth = lostMonth * (get('recover') / 100);
      $('[data-out=lostMonth]', calc).textContent = money(lostMonth);
      $('[data-out=lostYear]', calc).textContent = money(lostMonth * 12);
      $('[data-out=recYear]', calc).textContent = money(recMonth * 12);
      var roi = $('[data-out=roi]', calc);
      if (recMonth <= 0) { roi.innerHTML = 'Move the sliders to see your numbers.'; return; }
      var x = recMonth / plan;
      roi.innerHTML = x >= 1
        ? 'At these numbers, Boomerang Pro ($' + plan + '/mo) pays for itself <b>' + (x >= 10 ? Math.round(x) : x.toFixed(1)) + '× over</b> every month.'
        : 'At these numbers, recovered jobs cover <b>' + Math.round(x * 100) + '%</b> of Boomerang Pro ($' + plan + '/mo).';
    }
    $$('input', calc).forEach(function (i) { i.addEventListener('input', update); });
    update();
  });

  // ---------- Trust Dial ----------
  $$('[data-dial]').forEach(function (wrap) {
    var flows = JSON.parse($('script[type="application/json"]', wrap).textContent);
    var box = $('.dial-flow', wrap);
    function show(id) {
      $$('.dial button', wrap).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === id ? 'true' : 'false'); });
      box.innerHTML = flows[id].map(function (f) {
        return '<div class="f"><i>' + f[0] + '</i><span>' + f[1] + '</span></div>';
      }).join('');
    }
    $$('.dial button', wrap).forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.mode); }); });
    show('assisted_business_hours');
  });

  // ---------- demo player (an animated, accessible stand-in for a video) ----------
  $$('[data-player]').forEach(function (player) {
    var data = JSON.parse($('script[type="application/json"]', player).textContent);
    var stage = $('.stage', player), cap = $('.caption', player), bar = $('.progress span', player);
    var btn = $('.player-ctrl button', player);
    var timers = [], current = null, paused = false, inView = false;

    function clear() { timers.forEach(clearTimeout); timers = []; }
    function at(ms, fn) { timers.push(setTimeout(fn, reduce ? 0 : ms)); }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function phone(title, sub) {
      stage.innerHTML = '';
      var p = el('div', 'phone');
      p.appendChild(el('div', 'phone-top', '<b>' + esc(title) + '</b>' + esc(sub)));
      var t = el('div', 'thread'); p.appendChild(t);
      var typing = el('div', 'typing', '<i></i><i></i><i></i>');
      t.appendChild(typing);
      stage.appendChild(p);
      return { thread: t, typing: typing };
    }
    function push(ph, cls, html) {
      var b = el('div', 'bubble ' + cls, html);
      ph.thread.insertBefore(b, ph.typing);
      requestAnimationFrame(function () { b.classList.add('show'); });
      // keep the newest messages visible
      while (ph.thread.scrollHeight > ph.thread.clientHeight + 4 && ph.thread.children.length > 3) ph.thread.removeChild(ph.thread.firstChild);
    }

    function runScript(steps, total) {
      var t = 0;
      steps.forEach(function (s) {
        t += s.wait;
        var mark = t;
        at(mark, function () { s.fn(); bar.style.width = Math.min(100, (mark / total) * 100) + '%'; });
      });
      if (!reduce) at(total + 2500, function () { if (!paused) play(current); });
      else bar.style.width = '100%';
    }

    var scenes = {
      missed: function () {
        var ph = phone(data.business, 'Text message');
        var steps = [], t;
        steps.push({ wait: 300, fn: function () { cap.textContent = 'A customer calls while you’re on a job. You can’t answer.'; push(ph, 'sys miss', '☎ Missed call · (555) 214-8890'); } });
        data.chat.forEach(function (m, i) {
          var out = m[0] === 'out';
          if (out) steps.push({ wait: 700, fn: function () { ph.typing.classList.add('show'); } });
          steps.push({ wait: out ? 1300 : 1500, fn: function () {
            ph.typing.classList.remove('show');
            push(ph, out ? 'out' : 'in', esc(m[1]));
            if (i === 0) cap.textContent = 'Sara texts back in seconds, in your business name.';
            if (i === 2) cap.textContent = 'She asks the questions you would ask.';
            if (i === data.chat.length - 3) cap.textContent = 'She checks your real calendar and offers open times.';
          } });
        });
        steps.push({ wait: 1200, fn: function () {
          push(ph, 'cal', '<b>📅 Estimate booked</b><br>' + esc(data.booked));
          cap.textContent = 'It lands on your Google Calendar. You get a text with every detail.';
        } });
        t = steps.reduce(function (a, s) { return a + s.wait; }, 0);
        runScript(steps, t);
      },
      emergency: function () {
        var ph = phone(data.business, 'Text message');
        var steps = [
          { wait: 300, fn: function () { cap.textContent = 'Some calls can’t wait.'; push(ph, 'sys miss', '☎ Missed call · (555) 388-1021'); } },
          { wait: 1500, fn: function () { push(ph, 'in', esc(data.emergency)); } },
          { wait: 600, fn: function () { ph.typing.classList.add('show'); } },
          { wait: 1200, fn: function () { ph.typing.classList.remove('show'); push(ph, 'out', 'I’m so sorry, that sounds urgent. I’m alerting the team right now and someone will reach out as soon as possible. If anyone is hurt or in danger, please call 911.'); cap.textContent = 'Sara spots the emergency and stops asking questions.'; } },
          { wait: 1500, fn: function () { push(ph, 'sys', '📟 Owner paged · 1 second'); cap.textContent = 'You, or your on-call tech after hours, get paged in about a second.'; } },
          { wait: 1800, fn: function () { push(ph, 'sys', 'Sara steps back. You take it from here.'); } }
        ];
        runScript(steps, steps.reduce(function (a, s) { return a + s.wait; }, 0));
      },
      setup: function () {
        stage.innerHTML = '';
        var list = el('div', 'setup');
        var items = [
          ['Sign up', 'A 3-minute form. Pick Core or Pro.'],
          ['We scan your business', 'Sara learns your services, hours and FAQs from your website and Google listing. You approve it.'],
          ['We register your texting', 'We handle the carrier (A2P) paperwork and get you a local number.'],
          ['Forward unanswered calls', 'Your number stays the same and rings you first. Only missed calls come to Boomerang.'],
          ['Sara goes live', 'Your 14-day free trial starts the day texting goes live.']
        ];
        var nodes = items.map(function (it, i) {
          var n = el('div', 'setup-step', '<div class="n">' + (i + 1) + '</div><div><b>' + it[0] + '</b><span>' + it[1] + '</span></div>');
          list.appendChild(n); return n;
        });
        stage.appendChild(list);
        var steps = nodes.map(function (n, i) {
          return { wait: i === 0 ? 300 : 2400, fn: function () {
            if (i > 0) { nodes[i - 1].classList.remove('on'); nodes[i - 1].classList.add('done'); nodes[i - 1].querySelector('.n').textContent = '✓'; }
            n.classList.add('on'); cap.textContent = items[i][1];
          } };
        });
        steps.push({ wait: 2400, fn: function () { var l = nodes[nodes.length - 1]; l.classList.remove('on'); l.classList.add('done'); l.querySelector('.n').textContent = '✓'; cap.textContent = 'Done-for-you setup. You approve, we do the rest.'; } });
        runScript(steps, steps.reduce(function (a, s) { return a + s.wait; }, 0));
      }
    };

    function play(name) {
      clear(); current = name; paused = false; bar.style.width = '0';
      btn.textContent = 'Pause';
      $$('.player-tabs button', player).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.scene === name ? 'true' : 'false'); });
      scenes[name]();
    }
    $$('.player-tabs button', player).forEach(function (b) { b.addEventListener('click', function () { play(b.dataset.scene); }); });
    btn.addEventListener('click', function () {
      if (paused) { play(current); } else { clear(); paused = true; btn.textContent = 'Replay'; }
    });

    // start when visible, so it doesn't play off-screen
    var first = $('.player-tabs button', player).dataset.scene;
    if ('IntersectionObserver' in window && !reduce) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !inView) { inView = true; play(first); } });
      }, { threshold: .3 }).observe(player);
    } else { play(first); }
  });
})();
