(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var SVGNS = "http://www.w3.org/2000/svg";

  function icons() { if (window.lucide) window.lucide.createIcons(); }

  /* ---------- Marquee chips (duplicated once so the loop is seamless) ---------- */
  $$(".marquee-track[data-chips]").forEach(function (track) {
    var names = track.getAttribute("data-chips").split("|");
    names.concat(names).forEach(function (name, i) {
      var chip = document.createElement("span");
      chip.className = "logo-chip";
      chip.textContent = name;
      if (i >= names.length) chip.setAttribute("aria-hidden", "true");
      track.appendChild(chip);
    });
  });

  /* ---------- Nav: background on scroll, mobile menu ---------- */
  var nav = $("#nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var toggle = $(".nav-toggle");
  var menu = $(".nav nav");
  toggle.addEventListener("click", function () {
    toggle.setAttribute("aria-expanded", String(menu.classList.toggle("open")));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { menu.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- Waveform shapes, shared by the hero stage and the demo card ---------- */
  function gauss(u, m, s) { var d = (u - m) / s; return Math.exp(-0.5 * d * d); }
  var wave = {
    // one PQRST complex per `period` px; returns roughly -0.3..1
    ecg: function (x, period) {
      var u = (((x % period) + period) % period) / period;
      return 0.12 * gauss(u, 0.20, 0.03) - 0.14 * gauss(u, 0.285, 0.010) + gauss(u, 0.31, 0.012)
           - 0.26 * gauss(u, 0.34, 0.011) + 0.30 * gauss(u, 0.56, 0.05);
    },
    resp: function (x, period) { return Math.sin(2 * Math.PI * x / period) * (0.72 + 0.28 * Math.sin(2 * Math.PI * x / (period * 6.3))); },
    hr:   function (x) { return 0.55 * Math.sin(x / 150) + 0.3 * Math.sin(x / 47 + 1) + 0.15 * Math.sin(x / 19 + 2); },
    cgm:  function (x) { return 0.7 * Math.sin(x / 230) + 0.3 * Math.sin(x / 90 + 0.6); }
  };

  /* ---------- Hero stage: scrolling sensor traces with capability markers ---------- */
  (function () {
    var stage = $(".stage");
    if (!stage) return;
    var canvas = $(".traces", stage);
    var ctx = canvas.getContext("2d");
    var stars = $$(".star", stage);
    var TRACES = [
      { y: 0.18, color: "#3f7fc4", amp: 0.20, speed: 34, fn: function (x) { return wave.ecg(x, 128) - 0.3; } },
      { y: 0.40, color: "#4f9d69", amp: 0.075, speed: 20, fn: function (x) { return wave.resp(x, 150); } },
      { y: 0.62, color: "#d9577a", amp: 0.06, speed: 12, fn: wave.hr, beads: 30 },
      { y: 0.84, color: "#dd8a2f", amp: 0.07, speed: 8, fn: wave.cgm, beads: 16, beadsOnly: true }
    ];
    var w = 0, h = 0;

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      w = stage.clientWidth; h = stage.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var dim = stage.classList.contains("has-active");
      TRACES.forEach(function (tr) {
        var off = t * tr.speed, cy = tr.y * h, a = tr.amp * h, x;
        ctx.globalAlpha = dim ? 0.28 : 0.62;
        ctx.strokeStyle = tr.color; ctx.fillStyle = tr.color;
        ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.lineCap = "round";
        if (!tr.beadsOnly) {
          ctx.beginPath();
          for (x = 0; x <= w; x += 2) {
            var y = cy - a * tr.fn(x + off);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        if (tr.beads) {
          for (x = -(off % tr.beads); x <= w; x += tr.beads) {
            ctx.beginPath();
            ctx.arc(x, cy - a * tr.fn(x + off), tr.beadsOnly ? 2.4 : 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      ctx.globalAlpha = 1;
    }

    function frame(ms) { draw(ms / 1000); if (!reduceMotion.matches) requestAnimationFrame(frame); }
    function start() { resize(); if (reduceMotion.matches) draw(0); else requestAnimationFrame(frame); }

    window.addEventListener("resize", function () { resize(); if (reduceMotion.matches) draw(0); }, { passive: true });
    reduceMotion.addEventListener("change", start);
    start();

    function select(star) {
      stars.forEach(function (s) { s.classList.toggle("active", s === star); });
      stage.classList.toggle("has-active", !!star);
      if (reduceMotion.matches) draw(0);
    }
    stars.forEach(function (s) {
      s.addEventListener("mouseenter", function () { select(s); });
      s.addEventListener("focus", function () { select(s); });
      s.addEventListener("blur", function () { select(null); });
      s.addEventListener("click", function (e) { e.stopPropagation(); select(s); });
    });
    stage.addEventListener("mouseleave", function () { select(null); });
    document.addEventListener("click", function () { select(null); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") select(null); });
  })();

  /* ---------- Typewriter for the three hero lines (types once) ---------- */
  (function () {
    var lines = $$(".ln-content[data-type]").map(function (host) {
      var full = host.getAttribute("data-type");
      var ghost = document.createElement("span");   // reserves the final size so nothing reflows
      ghost.className = "ln-ghost"; ghost.textContent = full; ghost.setAttribute("aria-hidden", "true");
      var text = document.createElement("span");
      text.className = "ln-text";
      var typed = document.createElement("span");
      text.appendChild(typed);
      host.appendChild(ghost); host.appendChild(text);
      host.setAttribute("aria-label", full);
      return { full: full, text: text, typed: typed };
    });
    if (!lines.length) return;
    if (reduceMotion.matches) { lines.forEach(function (l) { l.typed.textContent = l.full; }); return; }

    var caret = document.createElement("span");
    caret.className = "caret"; caret.setAttribute("aria-hidden", "true");
    var li = 0, ci = 0;
    function next() {
      if (li >= lines.length) { setTimeout(function () { caret.remove(); }, 2400); return; }
      lines[li].text.appendChild(caret);
      ci = 0; tick();
    }
    function tick() {
      var l = lines[li];
      l.typed.textContent = l.full.slice(0, ++ci);
      if (ci < l.full.length) setTimeout(tick, 16 + Math.random() * 26);
      else { li++; setTimeout(next, 520); }
    }
    setTimeout(next, 600);
  })();

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, idx) {
        if (!en.isIntersecting) return;
        en.target.style.transitionDelay = (Math.min(idx, 4) * 70) + "ms";
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Count-up stats ---------- */
  (function () {
    var nums = $$(".num[data-count]");
    if (!nums.length || reduceMotion.matches || !("IntersectionObserver" in window)) return;
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var start = null, dur = 1300;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io2.unobserve(en.target); } });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io2.observe(el); });
  })();

  /* ---------- Click-to-unfold: bullet list and facet cards ---------- */
  $$(".bl-head").forEach(function (head) {
    head.addEventListener("click", function () {
      head.setAttribute("aria-expanded", String(head.parentNode.classList.toggle("open")));
    });
  });
  $$(".mcard").forEach(function (card) {
    card.addEventListener("click", function () {
      card.setAttribute("aria-expanded", String(card.classList.toggle("open")));
    });
  });

  /* ---------- "Discover more": swap a finding's headline view for its detail view ---------- */
  $$(".finding-views").forEach(function (views) {
    var main = $(".view-main", views), detail = $(".view-detail", views);
    function swap(incoming, outgoing) {
      outgoing.style.opacity = "0";
      setTimeout(function () {
        outgoing.style.display = "none";
        incoming.style.display = "block";
        incoming.style.opacity = "0";
        void incoming.offsetWidth;            // commit the hidden state so the fade-in runs
        incoming.style.opacity = "1";
        var focusTo = $(incoming === detail ? ".back-btn" : ".discover-btn", incoming);
        if (focusTo) focusTo.focus({ preventScroll: true });
      }, reduceMotion.matches ? 0 : 260);
    }
    $(".discover-btn", views).addEventListener("click", function () { swap(detail, main); });
    $$("[data-open]", main).forEach(function (visual) {       // the illustration itself is a way in
      visual.addEventListener("click", function () { swap(detail, main); });
    });
    $(".back-btn", views).addEventListener("click", function () { swap(main, detail); });
  });

  /* ---------- One window, three questions ---------- */
  (function () {
    var tabs = $$(".ask-tab"), panels = $$(".ask-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("is-on", on);
          t.setAttribute("aria-selected", String(on));
        });
        panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== tab.getAttribute("data-ask"); });
      });
    });

    var holder = $(".ask-traces");
    if (!holder) return;
    [
      { name: "Resp", color: "#4f9d69", amp: 15, fn: function (x) { return wave.resp(x, 15.5); } },
      { name: "ECG",  color: "#3f7fc4", amp: 26, fn: function (x) { return wave.ecg(x, 34) - 0.32; } },
      { name: "HR",   color: "#d9577a", amp: 12, fn: function (x) { return wave.hr(x * 3.2); } }
    ].forEach(function (tr) {
      var d = "";
      for (var x = 0; x <= 300; x += 1) d += (x ? "L" : "M") + x + " " + (22 - tr.amp * tr.fn(x)).toFixed(1);
      var row = document.createElement("div");
      row.className = "ask-trace";
      row.innerHTML = "<span>" + tr.name + "</span>" +
        '<svg viewBox="0 0 300 44" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="' + tr.color +
        '" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
      holder.appendChild(row);
    });
  })();

  /* ---------- Action-prediction chart (balanced accuracy, Tables 2-4) ---------- */
  (function () {
    var chart = $("#action-chart");
    if (!chart) return;
    var body = $(".chart-body", chart);
    var LO = 45, HI = 85, TICKS = [50, 60, 70, 80];
    // ours = better of OpenSLA-B / OpenSLA-H; base = best of the eight compared baselines
    var DATA = [
      { group: "Clinical", name: "MC-MED",
        necessity: { ours: 72.5, v: "B", base: 64.6, who: "SensorLM" },
        category:  { ours: 68.7, v: "H", base: 63.1, who: "GPT-5.6-Luna" } },
      { name: "MIMIC-III",
        necessity: { ours: 75.4, v: "B", base: 71.2, who: "OpenTSLM" },
        category:  { ours: 74.5, v: "H", base: 66.0, who: "OpenTSLM" } },
      { group: "Operating room", name: "MOVER",
        necessity: { ours: 80.6, v: "H", base: 71.5, who: "OpenTSLM" },
        category:  { ours: 69.9, v: "H", base: 60.5, who: "Chronos-2" } },
      { name: "VitalDB",
        necessity: { ours: 66.3, v: "H", base: 52.1, who: "Chronos-2" },
        category:  { ours: 80.8, v: "H", base: 66.0, who: "ConvTrans" } },
      { group: "CGM", name: "MetaboNet",
        necessity: { ours: 65.0, v: "B", base: 62.9, who: "SensorLM" },
        category:  { ours: 59.6, v: "H", base: 58.7, who: "MMIM" } },
      { name: "PEDAP",
        necessity: { ours: 75.5, v: "B", base: 72.8, who: "ConvTrans" },
        category:  { ours: 56.3, v: "B", base: 66.2, who: "ConvTrans" } }
    ];
    var pos = function (v) { return ((v - LO) / (HI - LO) * 100) + "%"; };
    var el = function (cls, tag) { var n = document.createElement(tag || "div"); n.className = cls; return n; };

    var axis = el("c-axis");
    axis.appendChild(el("c-name"));
    var axisTrack = el("c-track");
    TICKS.forEach(function (t) {
      var s = document.createElement("span");
      s.style.left = pos(t); s.textContent = String(t);
      axisTrack.appendChild(s);
    });
    axis.appendChild(axisTrack); axis.appendChild(el("c-val"));
    axis.setAttribute("aria-hidden", "true");
    body.appendChild(axis);

    var rows = DATA.map(function (d) {
      if (d.group) { var g = el("c-group"); g.textContent = d.group; body.appendChild(g); }
      var row = el("c-row"); row.tabIndex = 0;
      var name = el("c-name"); name.textContent = d.name;
      var track = el("c-track");
      TICKS.forEach(function (t) { var gl = el("c-grid" + (t === 50 ? " chance" : "")); gl.style.left = pos(t); track.appendChild(gl); });
      var link = el("c-link"), base = el("c-dot base"), ours = el("c-dot ours");
      track.appendChild(link); track.appendChild(base); track.appendChild(ours);
      var val = el("c-val"), tip = el("c-tip");
      row.appendChild(name); row.appendChild(track); row.appendChild(val); row.appendChild(tip);
      body.appendChild(row);
      return { d: d, row: row, link: link, base: base, ours: ours, val: val, tip: tip };
    });

    function render(level) {
      rows.forEach(function (r) {
        var m = r.d[level], diff = m.ours - m.base;
        r.ours.style.left = pos(m.ours);
        r.base.style.left = pos(m.base);
        r.link.style.left = pos(Math.min(m.ours, m.base));
        r.link.style.width = (Math.abs(diff) / (HI - LO) * 100) + "%";
        r.val.innerHTML = "<b>" + m.ours.toFixed(1) + "</b>vs " + m.base.toFixed(1) + " <i>" + m.who + "</i>";
        var delta = (diff >= 0 ? "+" : "−") + Math.abs(diff).toFixed(1) + " pts";
        r.tip.textContent = "OpenSLA-" + m.v + " " + m.ours.toFixed(1) + "  ·  " + m.who + " " + m.base.toFixed(1) + "  ·  " + delta;
        r.row.setAttribute("aria-label", r.d.name + ": OpenSLA-" + m.v + " " + m.ours.toFixed(1) + ", " + m.who + " " + m.base.toFixed(1));
      });
    }
    $$(".seg button", chart).forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".seg button", chart).forEach(function (b) {
          b.classList.toggle("is-on", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
        render(btn.getAttribute("data-level"));
      });
    });
    render("necessity");
  })();

  /* ---------- Schematic of the action space (illustrative, not measured data):
                dots drift, give way under the pointer, and spring back ---------- */
  (function () {
    var plot = $(".cluster-plot");
    if (!plot) return;
    var canvas = $("canvas", plot), ctx = canvas.getContext("2d");
    var tags = $$(".cl-tag", plot);
    var W = 460, H = 320;   // design space; the drawing scales with the plot width
    var GROUPS = {
      other:  { n: 120, cx: 240, cy: 150, sx: 110, sy: 62, r: 3,   color: "#d3cfdc", drift: 1.6 },
      opioid: { n: 46,  cx: 320, cy: 105, sx: 46,  sy: 30, r: 3.6, color: "#6fb6d6", drift: 2.4, tag: [330, 30] },
      abx:    { n: 30,  cx: 140, cy: 190, sx: 20,  sy: 15, r: 4,   color: "#e8826b", drift: 2.0, tag: [222, 282] },
      imi:    { n: 9,   cx: 124, cy: 172, sx: 10,  sy: 8,  r: 5.2, color: "#4f38a0", drift: 1.6, tag: [72, 92], ring: true }
    };
    var seed = 20261;
    function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function norm() { return Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()); }

    var dots = [];
    Object.keys(GROUPS).forEach(function (key) {
      var g = GROUPS[key];
      for (var i = 0; i < g.n; i++) {
        dots.push({ g: key, hx: g.cx + norm() * g.sx, hy: g.cy + norm() * g.sy,
                    p1: rnd() * 6.28, p2: rnd() * 6.28, f1: 0.5 + rnd() * 0.7, f2: 0.5 + rnd() * 0.7,
                    ox: 0, oy: 0, vx: 0, vy: 0, s: 1, a: 1 });
      }
    });

    var w = 0, k = 1, t = 0, mouse = null, hot = null, tagHot = false, ripples = [], visible = false, running = false;
    var REACH = 62, PUSH = 20;

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      w = plot.clientWidth; k = (w / W) || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * H / W * dpr);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
    }
    function setHot(group) {
      if (hot === group) return;
      hot = group;
      tags.forEach(function (tag) { tag.classList.toggle("hot", tag.getAttribute("data-group") === hot); });
    }
    function pick() {
      if (tagHot || !mouse) return;
      var best = null, bestD = 30;
      dots.forEach(function (d) {
        if (d.g === "other") return;
        var dist = Math.hypot(d.hx + d.ox - mouse.x, d.hy + d.oy - mouse.y);
        if (dist < bestD) { bestD = dist; best = d.g; }
      });
      setHot(best);
    }

    function step(still) {
      dots.forEach(function (d) {
        var g = GROUPS[d.g];
        var tx = still ? 0 : Math.sin(t * d.f1 + d.p1) * g.drift;
        var ty = still ? 0 : Math.cos(t * d.f2 + d.p2) * g.drift;
        var near = false;
        if (mouse) {
          var dx = d.hx + d.ox - mouse.x, dy = d.hy + d.oy - mouse.y, dist = Math.hypot(dx, dy) || 0.01;
          if (dist < REACH) { var f = 1 - dist / REACH; f = f * f * PUSH; tx += dx / dist * f; ty += dy / dist * f; }
          near = dist < 24;
        }
        d.vx = (d.vx + (tx - d.ox) * 0.10) * 0.78; d.ox += d.vx;      // a soft spring, slightly underdamped
        d.vy = (d.vy + (ty - d.oy) * 0.10) * 0.78; d.oy += d.vy;
        d.s += ((hot === d.g ? 1.4 : 1) * (near ? 1.35 : 1) - d.s) * 0.2;
        d.a += ((hot && hot !== d.g ? 0.3 : 1) - d.a) * 0.15;
      });
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      Object.keys(GROUPS).forEach(function (key) {       // leader lines from each tag to its cluster
        var g = GROUPS[key];
        if (!g.tag) return;
        var above = g.tag[1] < g.cy;
        ctx.globalAlpha = hot === key ? 0.9 : 0.5;
        ctx.strokeStyle = hot === key ? g.color : "#b9b3c6";
        ctx.lineWidth = 1 / k;
        ctx.beginPath();
        ctx.moveTo(g.tag[0], g.tag[1] + (above ? 13 : -13));
        ctx.lineTo(g.cx + (g.tag[0] - g.cx) * 0.12, g.cy + (above ? -1 : 1) * g.sy * 1.3);
        ctx.stroke();
      });
      var imi = GROUPS.imi, phase = reduceMotion.matches ? 0.35 : (t % 2.4) / 2.4;   // the unseen action keeps pinging
      ctx.globalAlpha = 0.5 * (1 - phase);
      ctx.strokeStyle = "#664cbc"; ctx.lineWidth = 1.6 / k;
      ctx.beginPath(); ctx.arc(imi.cx, imi.cy, 12 + 26 * phase, 0, 6.2832); ctx.stroke();

      ripples = ripples.filter(function (r) { return now - r.t < 600; });
      ripples.forEach(function (r) {
        var age = (now - r.t) / 600;
        ctx.globalAlpha = 0.45 * (1 - age);
        ctx.beginPath(); ctx.arc(r.x, r.y, 8 + 70 * age, 0, 6.2832); ctx.stroke();
      });

      dots.forEach(function (d) {
        var g = GROUPS[d.g];
        ctx.globalAlpha = d.a;
        ctx.beginPath(); ctx.arc(d.hx + d.ox, d.hy + d.oy, g.r * d.s, 0, 6.2832);
        ctx.fillStyle = g.color; ctx.fill();
        if (g.ring) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke(); }
      });
      ctx.globalAlpha = 1;
    }

    function frame(ms) {
      if (!visible || reduceMotion.matches) { running = false; return; }
      t = ms / 1000; step(false); draw(ms);
      requestAnimationFrame(frame);
    }
    function wake() {            // animated: keep the loop alive; reduced motion: settle and paint once
      if (reduceMotion.matches) { for (var i = 0; i < 16; i++) step(true); draw(performance.now()); return; }
      if (visible && !running) { running = true; requestAnimationFrame(frame); }
    }
    function toDesign(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }

    plot.addEventListener("pointermove", function (e) { mouse = toDesign(e); pick(); wake(); });
    plot.addEventListener("pointerleave", function () { mouse = null; tagHot = false; setHot(null); wake(); });
    plot.addEventListener("pointerdown", function (e) {
      var p = toDesign(e);
      ripples.push({ x: p.x, y: p.y, t: performance.now() });
      dots.forEach(function (d) {            // a click knocks nearby dots outward
        var dx = d.hx + d.ox - p.x, dy = d.hy + d.oy - p.y, dist = Math.hypot(dx, dy) || 0.01;
        if (dist < 90) { var f = (1 - dist / 90) * 6; d.vx += dx / dist * f; d.vy += dy / dist * f; }
      });
      wake();
    });
    tags.forEach(function (tag) {
      tag.addEventListener("pointerenter", function () { tagHot = true; setHot(tag.getAttribute("data-group")); wake(); });
      tag.addEventListener("pointerleave", function () { tagHot = false; });
    });

    window.addEventListener("resize", function () { resize(); wake(); }, { passive: true });
    reduceMotion.addEventListener("change", wake);
    resize();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) resize();
        wake();
      }).observe(plot);
    } else { visible = true; wake(); }
    draw(0);
  })();

  /* ---------- Figures: load the animation only once the figure is on screen ---------- */
  $$("img[data-animation]").forEach(function (img) {
    var frame = img.closest("figure");
    var btn = $(".anim-toggle", frame);
    var poster = img.getAttribute("src"), anim = img.getAttribute("data-animation");
    var loaded = false, loading = false, playing = false;

    function paint() {
      img.src = playing ? anim : poster;
      btn.setAttribute("aria-label", playing ? "Pause animation" : "Play animation");
      btn.innerHTML = '<i data-lucide="' + (playing ? "pause" : "play") + '" aria-hidden="true"></i>';
      icons();
    }
    function load(thenPlay) {
      if (loaded || loading) return;
      loading = true;
      var pre = new Image();
      pre.onload = function () { loaded = true; playing = thenPlay; btn.hidden = false; paint(); };
      pre.onerror = function () { loading = false; };
      pre.src = anim;
    }
    btn.addEventListener("click", function () {
      if (!loaded) { load(true); return; }
      playing = !playing; paint();
    });

    if (reduceMotion.matches || !("IntersectionObserver" in window)) { btn.hidden = false; paint(); return; }
    var seen = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { seen.disconnect(); load(true); }
    }, { rootMargin: "200px 0px" });
    seen.observe(img);
  });

  /* ---------- Figure zoom ---------- */
  (function () {
    var dialog = $("#zoom"), big = $("#zoom-img"), title = $("#zoom-title");
    if (!dialog || !dialog.showModal) { $$(".zoom-btn").forEach(function (b) { b.hidden = true; }); return; }
    $$("[data-zoom]").forEach(function (fig) {
      var btn = $(".zoom-btn", fig), img = $("img", fig), cap = $("figcaption", fig);
      btn.addEventListener("click", function () {
        big.src = img.currentSrc || img.src; big.alt = img.alt;
        title.textContent = cap ? cap.textContent : "";
        dialog.showModal();
      });
    });
    $(".zoom-close", dialog).addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  })();

  /* ---------- Copy BibTeX ---------- */
  (function () {
    var btn = $("#copy-bib"), code = $("#bibtex"), status = $(".copy-status");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var text = code.textContent;
      var done = function (msg) { status.textContent = msg; setTimeout(function () { status.textContent = ""; }, 2400); };
      var fallback = function () {
        var range = document.createRange();
        range.selectNodeContents(code);
        var sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
        try { done(document.execCommand("copy") ? "Copied" : "Selected — press Ctrl+C"); }
        catch (err) { done("Selected — press Ctrl+C"); }
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done("Copied"); }, fallback);
      else fallback();
    });
  })();

  icons();
})();
