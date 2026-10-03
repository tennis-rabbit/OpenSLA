(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var narrow = window.matchMedia("(max-width: 820px)");
  var SVGNS = "http://www.w3.org/2000/svg";

  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

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

  /* ---------- Scroll-scrubbed frame sequences (Figure 1 in the hero, Figure 3 in How it works) ----------
     A tall track holds a sticky stage; scroll progress through the track picks a frame. Frames load in
     passes (every 8th, every 4th, then all) so scrubbing works before the whole sequence is in. */
  function Scrubber(canvas, onProgress) {
    var track = canvas.closest(".scrub-track");
    var dir = canvas.getAttribute("data-frames"), count = +canvas.getAttribute("data-count");
    var start = +canvas.getAttribute("data-start") || 0, FW = +canvas.getAttribute("data-w"), FH = +canvas.getAttribute("data-h");
    var ctx = canvas.getContext("2d");
    var frames = new Array(count), current = -1, progress = 0;
    var isStatic = reduceMotion.matches || narrow.matches;
    var section = track.parentNode;
    if (isStatic) section.classList.add("static");

    function src(i) { return dir + "/" + String(i).padStart(3, "0") + ".webp"; }
    function load(i, cb) {
      if (frames[i]) { if (cb) cb(); return; }
      var im = new Image();
      im.onload = function () { frames[i] = im; if (cb) cb(); };
      im.src = src(i);
    }
    function nearestLoaded(i) {
      for (var d = 0; d < count; d++) {
        if (frames[i - d]) return i - d;
        if (frames[i + d]) return i + d;
      }
      return -1;
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth, h = canvas.clientHeight || Math.round(w * FH / FW);
      if (!w) return false;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        current = -1;
      }
      return true;
    }
    function paint(i, force) {
      if (!size()) return;
      var j = nearestLoaded(i);
      if (j < 0 || (j === current && !force)) return;
      var im = frames[j], w = canvas.clientWidth, h = canvas.clientHeight;
      var s = Math.min(w / FW, h / FH), dw = FW * s, dh = FH * s;      // contain, centred
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
      current = j;
    }
    function target() { return isStatic ? count - 1 : start + Math.round(progress * (count - 1 - start)); }
    function update() {
      if (!isStatic) {
        var r = track.getBoundingClientRect(), span = track.offsetHeight - window.innerHeight;
        progress = span > 0 ? clamp(-r.top / span, 0, 1) : 1;
      }
      var i = target();
      if (!frames[i]) load(i, function () { paint(target(), false); });
      paint(i, false);
      if (onProgress) onProgress(progress, i);
    }

    // first frame, then the rest in widening passes
    load(isStatic ? count - 1 : start, function () { update(); });
    if (!isStatic) {
      var order = [];
      [8, 4, 2, 1].forEach(function (step) { for (var i = start; i < count; i += step) if (order.indexOf(i) < 0) order.push(i); });
      var k = 0;
      (function next() {
        if (k >= order.length) return;
        var i = order[k++];
        load(i, function () { if (i === target()) paint(i, false); next(); });
      })();
    }

    var ticking = false;
    function onScrollTick() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }
    window.addEventListener("scroll", onScrollTick, { passive: true });
    window.addEventListener("resize", function () { current = -1; update(); }, { passive: true });
    update();
  }

  /* ---------- Hero: lead lines light up as the figure assembles ---------- */
  (function () {
    var canvas = $(".hero .scrub");
    if (!canvas) return;
    var lines = $$(".hero-line"), hint = $(".hero-hint");
    Scrubber(canvas, function (p) {
      lines.forEach(function (l) { l.classList.toggle("on", p >= +l.getAttribute("data-at")); });
      if (hint) hint.classList.toggle("off", p > 0.03);
    });
  })();

  /* ---------- How it works: steps follow the drawing ---------- */
  (function () {
    var canvas = $("#how .scrub");
    if (!canvas) return;
    var steps = $$("#how-steps li");
    Scrubber(canvas, function (p) {
      var active = 0;
      steps.forEach(function (s, i) { if (p >= +s.getAttribute("data-from")) active = i; });
      steps.forEach(function (s, i) { s.classList.toggle("on", i === active); s.classList.toggle("done", i < active); });
    });
  })();

  /* ---------- Waveform shapes for the illustrative traces in the demo card ---------- */
  function gauss(u, m, s) { var d = (u - m) / s; return Math.exp(-0.5 * d * d); }
  var wave = {
    ecg: function (x, period) {
      var u = (((x % period) + period) % period) / period;
      return 0.12 * gauss(u, 0.20, 0.03) - 0.14 * gauss(u, 0.285, 0.010) + gauss(u, 0.31, 0.012)
           - 0.26 * gauss(u, 0.34, 0.011) + 0.30 * gauss(u, 0.56, 0.05);
    },
    resp: function (x, period) { return Math.sin(2 * Math.PI * x / period) * (0.72 + 0.28 * Math.sin(2 * Math.PI * x / (period * 6.3))); },
    hr:   function (x) { return 0.55 * Math.sin(x / 150) + 0.3 * Math.sin(x / 47 + 1) + 0.15 * Math.sin(x / 19 + 2); }
  };

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

  /* ---------- One window, three questions: the answer streams in ---------- */
  (function () {
    var card = $(".ask");
    if (!card) return;
    var tabs = $$(".ask-tab", card), q = $(".chat-q", card), a = $(".chat-a", card);
    var caret = document.createElement("span"); caret.className = "caret"; caret.setAttribute("aria-hidden", "true");
    var run = 0;

    function stream(id) {
      var token = ++run;
      var tab = tabs.filter(function (t) { return t.getAttribute("data-ask") === id; })[0];
      tabs.forEach(function (t) { var on = t === tab; t.classList.toggle("is-on", on); t.setAttribute("aria-selected", String(on)); });
      q.textContent = tab.textContent.replace(/^[ABC]/, "").trim();
      a.innerHTML = "";
      a.appendChild($("#ans-" + id).content.cloneNode(true));
      var leaves = $$("[data-type]", a);
      if (reduceMotion.matches) { leaves.forEach(function (l) { l.textContent = l.getAttribute("data-type"); }); return; }
      var li = 0;
      function next() {
        if (token !== run) return;
        if (li >= leaves.length) { setTimeout(function () { if (token === run) caret.remove(); }, 1800); return; }
        var leaf = leaves[li++], full = leaf.getAttribute("data-type"), ci = 0;
        leaf.textContent = ""; leaf.appendChild(caret);
        (function tick() {
          if (token !== run) return;
          ci++;
          leaf.textContent = full.slice(0, ci); leaf.appendChild(caret);
          if (ci < full.length) setTimeout(tick, 14 + Math.random() * 22);
          else setTimeout(next, 260);
        })();
      }
      setTimeout(next, 350);
    }

    tabs.forEach(function (t) { t.addEventListener("click", function () { stream(t.getAttribute("data-ask")); }); });
    $(".replay", card).addEventListener("click", function () {
      stream(tabs.filter(function (t) { return t.classList.contains("is-on"); })[0].getAttribute("data-ask"));
    });

    // start the first answer when the card comes into view
    if ("IntersectionObserver" in window && !reduceMotion.matches) {
      var seen = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { seen.disconnect(); stream("a"); }
      }, { threshold: 0.4 });
      seen.observe(card);
    } else { stream("a"); }

    var holder = $(".ask-traces", card);
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

  /* ---------- Grounding: hover a caption phrase, the region it comes from lights up ----------
     Regions are hand-marked boxes on the figure crops, in image pixels. */
  var REGIONS = {
    fig2: {   // assets/fig2-signals.png, 1086 x 687
      "complaint": [104, 141, 304, 206],
      "ecg":       [358, 38, 1065, 137],  "ecg-box":  [652, 41, 728, 131],
      "resp":      [358, 192, 1065, 251],
      "rr":        [358, 254, 1065, 323], "rr-box":   [847, 258, 1047, 319],
      "hr":        [358, 319, 1065, 381],
      "pain-box":  [706, 374, 793, 416],
      "target":    [782, 560, 1054, 608]
    },
    fig4: {   // assets/fig4-signals.png, 1131 x 653
      "ecg":       [44, 13, 1110, 88],    "ecg-box":  [384, 13, 593, 91],
      "hr":        [44, 450, 1110, 516]
    }
  };
  $$(".ground").forEach(function (g) {
    var regions = REGIONS[g.getAttribute("data-ground")], svg = $(".ground-mask", g);
    if (!regions || !svg) return;
    var vb = svg.getAttribute("viewBox").split(" ").map(Number), W = vb[2], H = vb[3];
    var maskId = "m-" + g.getAttribute("data-ground");
    svg.innerHTML =
      '<defs><mask id="' + maskId + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/><g class="holes"></g></mask></defs>' +
      '<rect class="dim" width="' + W + '" height="' + H + '" mask="url(#' + maskId + ')"/><g class="boxes"></g>';
    var holes = $(".holes", svg), boxes = $(".boxes", svg);
    var pinned = null;

    function show(span) {
      holes.innerHTML = ""; boxes.innerHTML = "";
      if (!span) { svg.classList.remove("on"); return; }
      var color = getComputedStyle(span.closest(".gblock")).getPropertyValue("--acc").trim() || "#664cbc";
      span.getAttribute("data-to").split(",").forEach(function (key) {
        var b = regions[key.trim()]; if (!b) return;
        var pad = 6;
        [["holes", "#000"], ["boxes", null]].forEach(function (t) {
          var r = document.createElementNS(SVGNS, "rect");
          r.setAttribute("x", b[0] - pad); r.setAttribute("y", b[1] - pad);
          r.setAttribute("width", b[2] - b[0] + 2 * pad); r.setAttribute("height", b[3] - b[1] + 2 * pad);
          r.setAttribute("rx", 8);
          if (t[1]) { r.setAttribute("fill", t[1]); holes.appendChild(r); }
          else { r.setAttribute("class", "box"); r.setAttribute("stroke", color); boxes.appendChild(r); }
        });
      });
      svg.classList.add("on");
    }
    $$(".gs", g).forEach(function (span) {
      span.setAttribute("tabindex", "0");
      span.addEventListener("mouseenter", function () { if (!pinned) show(span); });
      span.addEventListener("mouseleave", function () { if (!pinned) show(null); });
      span.addEventListener("focus", function () { if (!pinned) show(span); });
      span.addEventListener("blur", function () { if (!pinned) show(null); });
      span.addEventListener("click", function (e) {
        e.stopPropagation();
        if (pinned === span) { pinned = null; span.classList.remove("on"); show(span); return; }
        if (pinned) pinned.classList.remove("on");
        pinned = span; span.classList.add("on"); show(span);
      });
    });
    document.addEventListener("click", function () { if (pinned) { pinned.classList.remove("on"); pinned = null; show(null); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pinned) { pinned.classList.remove("on"); pinned = null; show(null); } });
  });

  /* ---------- Alpha: slide along the interpolation path in Figure 6 ---------- */
  (function () {
    var box = $(".alpha");
    if (!box) return;
    var range = $(".alpha-range", box), val = $(".alpha-val", box), dose = $(".alpha-dose", box), tag = $(".alpha-tag", box);
    var halo = $(".alpha-halo", box), dot = $(".alpha-dot", box);
    // the four stops on the dashed path in panel (a), in image pixels of action-representations.png (2789 x 704)
    var STOPS = [
      { a: 0.0, x: 75,  y: 144, dose: "0.05 U", tag: "endpoint" },
      { a: 0.4, x: 340, y: 310, dose: "1.2 U",  tag: "retrieved" },
      { a: 0.8, x: 608, y: 468, dose: "7.7 U",  tag: "retrieved" },
      { a: 1.0, x: 747, y: 546, dose: "14.4 U", tag: "endpoint" }
    ];
    function place(a) {
      var i = 0; while (i < STOPS.length - 2 && a > STOPS[i + 1].a) i++;
      var s0 = STOPS[i], s1 = STOPS[i + 1], t = (a - s0.a) / (s1.a - s0.a);
      var x = s0.x + (s1.x - s0.x) * t, y = s0.y + (s1.y - s0.y) * t;
      [halo, dot].forEach(function (c) { c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); });
      var near = STOPS.reduce(function (best, s) { return Math.abs(s.a - a) < Math.abs(best.a - a) ? s : best; }, STOPS[0]);
      val.innerHTML = "&alpha; = " + a.toFixed(2);
      dose.textContent = near.dose; tag.textContent = near.tag;
    }
    range.addEventListener("input", function () { place(+range.value); });
    place(0);
    // a gentle demo sweep the first time the figure is seen, unless the reader has already touched it
    if ("IntersectionObserver" in window && !reduceMotion.matches) {
      var touched = false;
      range.addEventListener("pointerdown", function () { touched = true; }, { once: true });
      var seen = new IntersectionObserver(function (entries) {
        if (!entries.some(function (en) { return en.isIntersecting; })) return;
        seen.disconnect();
        var t0 = null;
        (function sweep(ts) {
          if (touched) return;
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / 3200, 1), e = 0.5 - 0.5 * Math.cos(Math.PI * p);
          range.value = e.toFixed(2); place(e);
          if (p < 1) requestAnimationFrame(sweep);
        })(performance.now());
      }, { threshold: 0.5 });
      seen.observe(box);
    }
  })();

  /* ---------- Click-to-unfold bullet list ---------- */
  $$(".bl-head").forEach(function (head) {
    head.addEventListener("click", function () {
      head.setAttribute("aria-expanded", String(head.parentNode.classList.toggle("open")));
    });
  });

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
    // dots start on the chance line and slide out when the chart is first seen
    rows.forEach(function (r) { r.ours.style.left = r.base.style.left = r.link.style.left = pos(50); r.link.style.width = "0%"; });
    if ("IntersectionObserver" in window && !reduceMotion.matches) {
      var seen = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { seen.disconnect(); setTimeout(function () { render("necessity"); }, 150); }
      }, { threshold: 0.3 });
      seen.observe(chart);
    } else { render("necessity"); }
  })();

  /* ---------- Figure zoom ---------- */
  (function () {
    var dialog = $("#zoom"), big = $("#zoom-img"), title = $("#zoom-title");
    if (!dialog || !dialog.showModal) { $$(".zoom-btn, .scrub-zoom").forEach(function (b) { b.hidden = true; }); return; }
    $$(".zoom-btn, .scrub-zoom").forEach(function (btn) {
      var fig = btn.closest("figure"), img = fig ? $("img", fig) : null, cap = fig ? $("figcaption", fig) : null;
      btn.addEventListener("click", function () {
        big.src = btn.getAttribute("data-src") || (img && (img.currentSrc || img.src)) || "";
        big.alt = img ? img.alt : "";
        title.textContent = btn.getAttribute("data-title") || (cap ? cap.textContent : "");
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
