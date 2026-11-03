/**
 * Noir Signal — site interactions
 * Handles navigation, motion, UI sound, and project-page effects.
 * Runs once as an IIFE so nothing leaks onto window.
 */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- UI click audio (Web Audio; no external files) ----------
     Soft synthesized ticks on interactive controls. AudioContext is
     created lazily on the first user gesture so browsers allow playback. */
  const uiAudio = (() => {
    let ctx = null;
    const ensure = () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    };

    const tone = ({ freq = 880, endFreq = 440, dur = 0.05, type = "triangle", vol = 0.04, delay = 0 } = {}) => {
      const c = ensure();
      if (!c) return;
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator();
      const gain = c.createGain();
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2400;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    };

    return {
      /** Short confirmation tick for buttons, tabs, and nav. */
      click() {
        tone({ freq: 980, endFreq: 520, dur: 0.04, type: "triangle", vol: 0.032 });
      },
      /** Dual-layer cue when the Matrix rain burst starts. */
      matrix() {
        tone({ freq: 180, endFreq: 90, dur: 0.12, type: "sawtooth", vol: 0.028 });
        tone({ freq: 1240, endFreq: 640, dur: 0.09, type: "square", vol: 0.018, delay: 0.02 });
      },
    };
  })();

  /* Wire click sounds to primary interactive controls (not every DOM click). */
  document.addEventListener(
    "click",
    (event) => {
      const hit = event.target.closest(
        "button, .btn, .arch-node, .site-nav__burger, .site-menu__x, .site-menu__backdrop, a.card-btn, .case-progress-track a, .site-nav__desktop a, .site-menu__nav a, .edu-card, .related-card, .cert-card, .social-logo, .site-footer__resume, .site-footer__nav a, .site-footer__social a"
      );
      if (!hit) return;
      /* Matrix images play their own cue — skip the generic tick there. */
      if (event.target.closest("[data-matrix-target]")) return;
      uiAudio.click();
    },
    true
  );

  /* ---------- Copyright year ---------- */
  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = year;
  });

  /* External http(s) links → new tab + noopener */
  document.querySelectorAll('a[href^="http://"], a[href^="https://"]').forEach((link) => {
    try {
      if (link.hostname === window.location.hostname) return;
    } catch (_) {
      /* ignore */
    }
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });

  document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach((link) => {
    link.setAttribute("rel", "noopener noreferrer");
  });

  /* Hero entrance stagger */
  const hero = document.querySelector(".hero");
  if (hero) {
    if (reduceMotion) {
      hero.classList.add("is-ready");
    } else {
      requestAnimationFrame(() => hero.classList.add("is-ready"));
    }
  }

  /* Intersection reveals for bands + case sections */
  const revealTargets = document.querySelectorAll(".band, .case-section");
  if (reduceMotion) {
    revealTargets.forEach((el) => {
      el.classList.add("visible", "is-visible");
    });
  } else if (revealTargets.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible", "is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* In-page section navigation */
  const navOffset = () => {
    const nav = document.querySelector(".site-nav");
    return (nav ? nav.offsetHeight : 60) + 10;
  };

  let closeSiteMenu = () => {};

  const scrollToId = (id, behavior) => {
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    closeSiteMenu();
    const top = target.getBoundingClientRect().top + window.scrollY - navOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: behavior || (reduceMotion ? "auto" : "smooth"),
    });
    return true;
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const raw = link.getAttribute("href");
    if (!raw || raw === "#" || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;

    let url;
    try {
      url = new URL(raw, window.location.href);
    } catch (_) {
      return;
    }

    const normalizePath = (path) =>
      path.replace(/\/index\.html$/i, "/").replace(/\/+$/, "") || "/";
    const samePage =
      url.origin === window.location.origin &&
      normalizePath(url.pathname) === normalizePath(window.location.pathname);
    if (!samePage || !url.hash || url.hash.length < 2) return;

    const id = decodeURIComponent(url.hash.slice(1));
    if (!document.getElementById(id)) return;

    event.preventDefault();
    closeSiteMenu();
    scrollToId(id);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  });

  /* Honor hash on load (home or returning from a project page) */
  window.addEventListener("load", () => {
    const id = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    if (id) {
      requestAnimationFrame(() => scrollToId(id, "auto"));
    }
  });

  /* Mobile menu: fixed overlay is a sibling of the sticky nav (not nested),
     so position:fixed is not trapped by transform on the header. */
  (() => {
    const bar = document.querySelector("[data-site-nav]");
    const menu = document.querySelector("[data-site-menu]");
    const openBtn = document.querySelector("[data-site-menu-open]");
    if (!bar || !menu || !openBtn) return;

    const sheet = menu.querySelector(".site-menu__sheet");
    const mq = window.matchMedia("(max-width: 820px)");
    let lastFocus = null;
    let open = false;

    const setOpen = (next) => {
      if (next && !mq.matches) return;
      if (next === open) return;
      open = next;

      if (open) {
        menu.hidden = false;
        /* Force reflow so the CSS open transition actually plays. */
        void menu.offsetWidth;
        menu.classList.add("is-open");
        bar.classList.add("is-menu-open");
        document.body.classList.add("nav-locked");
        openBtn.setAttribute("aria-expanded", "true");
        openBtn.setAttribute("aria-label", "Close menu");
        lastFocus = document.activeElement;
        const focusTarget = menu.querySelector("[data-site-menu-close].site-menu__x") || sheet?.querySelector("a");
        window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 30);
      } else {
        menu.classList.remove("is-open");
        bar.classList.remove("is-menu-open");
        document.body.classList.remove("nav-locked");
        openBtn.setAttribute("aria-expanded", "false");
        openBtn.setAttribute("aria-label", "Open menu");
        const hide = () => {
          if (!open) menu.hidden = true;
        };
        if (reduceMotion) hide();
        else window.setTimeout(hide, 420);
        if (lastFocus && typeof lastFocus.focus === "function") {
          lastFocus.focus({ preventScroll: true });
          lastFocus = null;
        }
      }
    };

    closeSiteMenu = () => setOpen(false);

    openBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (!mq.matches) return;
      setOpen(!open);
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("[data-site-menu-close]")) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      const link = event.target.closest("a[href]");
      if (link) {
        /* Same-page hash scroll closes via scrollToId; cross-page just close. */
        window.setTimeout(() => setOpen(false), 0);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    });

    const onBreakpoint = () => {
      if (!mq.matches) setOpen(false);
    };
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onBreakpoint);
    else mq.addListener(onBreakpoint);
  })();

  /* Subtle parallax on featured media */
  (() => {
    const layers = document.querySelectorAll("[data-parallax]");
    if (!layers.length || reduceMotion) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      const vh = window.innerHeight || 1;
      layers.forEach((layer) => {
        const media = layer.closest(".card-media") || layer.parentElement;
        if (!media) return;
        const rect = media.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        const shift = Math.max(-18, Math.min(18, progress * -28));
        layer.style.transform = `translate3d(0, ${shift}px, 0)`;
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  })();

  /* FOOTPRINT metrics — animate rings/bars for existing numbers only */
  (() => {
    const metrics = document.querySelectorAll(".metric[data-metric]");
    if (!metrics.length) return;

    const circumference = 2 * Math.PI * 45; // r=45

    const prepare = (metric) => {
      const type = metric.dataset.metric;
      const value = parseFloat(metric.dataset.value || "0");
      const ring = metric.querySelector(".ring-value");
      const bar = metric.querySelector(".metric-bar");

      if (type === "pct" && ring) {
        const pct = Math.max(0, Math.min(100, value));
        const offset = circumference - (pct / 100) * circumference;
        metric.style.setProperty("--ring-offset", String(offset));
        if (bar) metric.style.setProperty("--bar-pct", `${pct}%`);
      } else if (type === "count") {
        if (bar) metric.style.setProperty("--bar-pct", "100%");
        if (ring) {
          metric.style.setProperty("--ring-offset", String(circumference * 0.12));
        }
      }
    };

    metrics.forEach(prepare);

    if (reduceMotion) {
      metrics.forEach((m) => m.classList.add("is-animated"));
      return;
    }

    const metricObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-animated");
          metricObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );
    metrics.forEach((m) => metricObserver.observe(m));
  })();

  /* Case progress bar: the highlight stays visually centered while the tab
     track translates underneath, so the active section label always reads in the middle. */
  (() => {
    const progress = document.querySelector(".case-progress");
    if (!progress) return;

    const windowEl = progress.querySelector(".case-progress-window");
    const track = progress.querySelector(".case-progress-track");
    const highlight = progress.querySelector(".case-progress-highlight");
    const links = [...progress.querySelectorAll("a[href^='#']")];
    if (!windowEl || !track || !highlight || !links.length) return;

    const sections = links
      .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
      .filter(Boolean);
    if (sections.length !== links.length) return;

    let activeIndex = -1;
    let clicking = false;
    let ticking = false;

    const navOffset = () => {
      const nav = document.querySelector(".site-nav");
      return (nav ? nav.offsetHeight : 60) + 12;
    };

    const centerTrackOn = (index, withFlick) => {
      const link = links[index];
      if (!link) return;
      const winW = windowEl.clientWidth;
      const target = winW / 2 - (link.offsetLeft + link.offsetWidth / 2);
      highlight.style.setProperty("--case-tab-w", `${Math.ceil(link.offsetWidth)}px`);

      if (withFlick && !reduceMotion) {
        track.classList.add("is-flicking");
        track.style.transform = `translate3d(${target}px, 0, 0)`;
        window.setTimeout(() => track.classList.remove("is-flicking"), 180);
      } else {
        track.classList.remove("is-flicking");
        track.style.transform = `translate3d(${target}px, 0, 0)`;
      }
    };

    const setActiveIndex = (index, withFlick) => {
      if (index < 0 || index >= links.length) return;
      if (index === activeIndex) return;
      activeIndex = index;
      links.forEach((link, i) => link.classList.toggle("is-active", i === index));
      centerTrackOn(index, withFlick);
    };

    const indexFromScroll = () => {
      const tops = sections.map((section) => section.getBoundingClientRect().top + window.scrollY);
      const marker = window.scrollY + navOffset();
      let index = 0;
      for (let i = 0; i < tops.length; i += 1) {
        if (marker >= tops[i] - 1) index = i;
      }
      return index;
    };

    const onScroll = () => {
      if (ticking || clicking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setActiveIndex(indexFromScroll(), true);
      });
    };

    links.forEach((link, index) => {
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href").slice(1);
        const section = document.getElementById(id);
        if (!section) return;
        event.preventDefault();
        clicking = true;
        setActiveIndex(index, true);
        const top = section.getBoundingClientRect().top + window.scrollY - navOffset();
        window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        window.setTimeout(() => {
          clicking = false;
          setActiveIndex(indexFromScroll(), false);
        }, reduceMotion ? 40 : 700);
      });
    });

    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    setActiveIndex(0, false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => setActiveIndex(Math.max(0, activeIndex), false), { passive: true });
  })();

  /* Experience timeline: progress line + dots lerp toward the farthest
     timeline item that has reached the upper reading band of the viewport. */
  (() => {
    const wrap = document.querySelector("[data-timeline]");
    if (!wrap) return;

    const list = wrap.querySelector(".career-timeline") || wrap;
    const items = [...list.querySelectorAll("li")];
    let progressEl = wrap.querySelector(".timeline-progress");
    if (!progressEl) {
      progressEl = document.createElement("span");
      progressEl.className = "timeline-progress";
      progressEl.setAttribute("aria-hidden", "true");
      wrap.prepend(progressEl);
    }

    items.forEach((item) => {
      if (!item.querySelector(".timeline-dot")) {
        const dot = document.createElement("span");
        dot.className = "timeline-dot";
        dot.setAttribute("aria-hidden", "true");
        item.prepend(dot);
      }
    });

    if (reduceMotion) {
      items.forEach((item) => item.classList.add("is-inview", "is-reached"));
      progressEl.style.transform = "scaleY(1)";
      return;
    }

    let currentP = 0;
    let targetP = 0;
    let rafId = 0;
    let trackH = 1;

    const measureTarget = () => {
      trackH = Math.max(1, list.offsetHeight - 8);
      const rect = wrap.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      /* Drive progress while the timeline is in the reading band (upper ~2/3). */
      const view = window.scrollY + window.innerHeight * 0.62;
      const raw = (view - start) / trackH;
      targetP = Math.max(0, Math.min(1, raw));
    };

    const tick = () => {
      measureTarget();
      const delta = targetP - currentP;
      if (Math.abs(delta) < 0.0015) currentP = targetP;
      else currentP += delta * 0.18;
      progressEl.style.transform = `scaleY(${currentP})`;

      const px = currentP * trackH;
      items.forEach((item) => {
        const dot = item.querySelector(".timeline-dot");
        /* offsetTop on the absolutely-positioned dot is relative to the li —
           measure along the list track via the item instead. */
        const y =
          item.offsetTop +
          (dot ? dot.offsetTop + dot.offsetHeight / 2 : item.offsetHeight / 2);
        const reached = px >= y - 4;
        item.classList.toggle("is-reached", reached);
        if (reached) item.classList.add("is-inview");
      });

      if (Math.abs(targetP - currentP) >= 0.0015) rafId = requestAnimationFrame(tick);
      else rafId = 0;
    };

    const kick = () => {
      measureTarget();
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-inview");
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((item) => itemObserver.observe(item));

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick, { passive: true });
    kick();
  })();

  /* Footprint interactive architecture flow (only when markup present) */
  (() => {
    const root = document.querySelector("[data-arch-flow]");
    if (!root) return;

    const panel = root.querySelector("[data-arch-panel]");
    const body = root.querySelector("[data-arch-panel-body]");
    const kicker = root.querySelector("[data-arch-kicker]");
    const titleEl = root.querySelector("[data-arch-title]");
    const factsEl = root.querySelector("[data-arch-facts]");
    const nodes = [...root.querySelectorAll("[data-arch-node]")];
    if (!panel || !body || !kicker || !titleEl || !factsEl || !nodes.length) return;

    /* Contracts grounded in github.com/akrmDev/Missing-Person-App */
    const contracts = {
      ingest: {
        kicker: "Stage 01 · Ingest",
        title: "Camera Feed / Upload",
        facts: [
          ["Input", "YouTube URL (validated) + optional camera/upload path"],
          ["Operator fields", "Feed name · <code>processing_speed</code> (slow / medium / fast)"],
          ["Handoff", "Creates a <code>live_feeds</code> doc with <code>feed_status: queued</code>"],
          ["Endpoint", "<code>POST /upload/</code>"],
        ],
      },
      django: {
        kicker: "Stage 02 · Control plane",
        title: "Django API Server",
        facts: [
          ["Runtime", "Django 5.1 · <code>home/views.py</code> orchestrates jobs"],
          ["Auth / users", "Firebase Auth + Firestore user records"],
          ["Job kickoff", "<code>docker-compose run --rm rq-worker python video_Enqueue.py …</code>"],
          ["Key routes", "<code>/upload/</code> · <code>/check-status/</code> · <code>/search_attributes1/</code> · <code>/dashboard/</code>"],
        ],
      },
      yolo: {
        kicker: "Stage 03 · Inference",
        title: "Dockerized YOLOv5 Inference",
        facts: [
          ["Container", "<code>python:3.10-slim</code> + Torch / OpenCV · RQ worker"],
          ["Model", "Ultralytics <code>yolov5s</code> (person class) → cropped detections"],
          ["Latency tradeoff", "Frame interval 1 / 5 / 10 sec maps to fast / medium / slow coverage"],
          ["Worker limits", "Compose caps ≈ <code>0.5 CPU</code> · <code>512MB</code> RAM per worker"],
          ["Pipeline", "<code>video_Enqueue.py</code> → <code>Video_processing.py</code> → attribute scripts"],
        ],
      },
      data: {
        kicker: "Stage 04 · Data plane",
        title: "Redis / Firestore",
        facts: [
          ["Queue", "Redis <code>:6379</code> · <code>REDIS_URL=redis://redis-server:6379/0</code> · RQ jobs"],
          ["Results", "Firestore <code>IdentifiedPersons</code> + clothing attribute docs"],
          ["Job status", "Firestore <code>live_feeds</code> polled by <code>GET /check-status/</code>"],
          ["Contract", "Detection crops + timestamps + speed key joinable to a feed"],
        ],
      },
      dashboard: {
        kicker: "Stage 05 · Operator UI",
        title: "Operator Web Dashboard",
        facts: [
          ["Surfaces", "Upload queue / history · attribute search · result galleries"],
          ["Query API", "<code>/search_attributes1/</code> filters hair / clothing traits"],
          ["Review aids", "Deep-links into source video at <code>detection_time</code>"],
          ["Admin", "<code>/admin_dashboard/</code> for account status controls"],
        ],
      },
    };

    const render = (id) => {
      const data = contracts[id];
      if (!data) return;
      kicker.textContent = data.kicker;
      titleEl.textContent = data.title;
      factsEl.innerHTML = data.facts
        .map(([dt, dd]) => `<dt>${dt}</dt><dd>${dd}</dd>`)
        .join("");
      body.hidden = false;
      panel.classList.remove("is-empty");
      nodes.forEach((node) => {
        const on = node.getAttribute("data-arch-node") === id;
        node.classList.toggle("is-active", on);
        node.setAttribute("aria-pressed", on ? "true" : "false");
      });
    };

    nodes.forEach((node) => {
      node.setAttribute("aria-pressed", "false");
      const id = node.getAttribute("data-arch-node");
      node.addEventListener("mouseenter", () => render(id));
      node.addEventListener("focus", () => render(id));
      node.addEventListener("click", () => render(id));
    });

    /* Seed first node so the panel is never an empty dead zone on load. */
    render(nodes[0].getAttribute("data-arch-node"));
  })();

  /* ---------- Matrix rain on project images ----------
     Clicking a case-study cover or gallery still triggers a short digital-rain
     burst over that frame. Skipped when the user prefers reduced motion. */
  (() => {
    const targets = document.querySelectorAll(".case-cover img, .gallery figure img");
    if (!targets.length) return;

    const glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01アイウエオカキクケコ01<>*+-=$:#";

    targets.forEach((img) => {
      img.setAttribute("data-matrix-target", "");
      img.setAttribute("title", "Click for Matrix effect");
      if (!img.hasAttribute("tabindex")) img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `${img.alt || "Project image"} — play Matrix effect`);
    });

    const runMatrix = (img) => {
      const host = img.closest(".case-cover, .gallery figure");
      if (!host) return;

      /* One burst at a time per frame. */
      if (host.querySelector(".matrix-overlay")) return;

      if (reduceMotion) {
        host.classList.add("matrix-flash");
        uiAudio.matrix();
        window.setTimeout(() => host.classList.remove("matrix-flash"), 420);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.className = "matrix-overlay";
      canvas.setAttribute("aria-hidden", "true");
      host.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let width = 0;
      let height = 0;
      let columns = [];
      let raf = 0;
      const started = performance.now();
      const duration = 2200;

      const resize = () => {
        const rect = host.getBoundingClientRect();
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const fontSize = Math.max(12, Math.round(width / 48));
        const colCount = Math.ceil(width / fontSize);
        columns = Array.from({ length: colCount }, () => ({
          y: Math.random() * height,
          speed: 2.2 + Math.random() * 5.5,
          fontSize,
        }));
      };

      resize();
      host.classList.add("is-matrix-active");
      uiAudio.matrix();

      const tick = (now) => {
        const elapsed = now - started;
        const fade = elapsed > duration - 500 ? Math.max(0, 1 - (elapsed - (duration - 500)) / 500) : 1;

        /* Trailing veil so glyphs leave a rain trail. */
        ctx.fillStyle = `rgba(5, 8, 6, ${0.14 + (1 - fade) * 0.1})`;
        ctx.fillRect(0, 0, width, height);

        columns.forEach((col, i) => {
          const x = i * col.fontSize;
          const ch = glyphs.charAt((Math.random() * glyphs.length) | 0);
          ctx.font = `${col.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
          ctx.fillStyle = `rgba(255, 77, 77, ${0.15 * fade})`;
          ctx.fillText(ch, x + 1, col.y + 1);
          ctx.fillStyle = `rgba(90, 255, 140, ${0.85 * fade})`;
          ctx.fillText(ch, x, col.y);
          /* Bright head glyph */
          ctx.fillStyle = `rgba(220, 255, 230, ${0.95 * fade})`;
          ctx.fillText(glyphs.charAt((Math.random() * glyphs.length) | 0), x, col.y - col.fontSize);

          col.y += col.speed;
          if (col.y > height + col.fontSize * 2) {
            col.y = -Math.random() * height * 0.3;
            col.speed = 2.2 + Math.random() * 5.5;
          }
        });

        if (elapsed < duration) {
          raf = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(raf);
          canvas.remove();
          host.classList.remove("is-matrix-active");
        }
      };

      raf = requestAnimationFrame(tick);
    };

    targets.forEach((img) => {
      img.addEventListener("click", (event) => {
        event.preventDefault();
        runMatrix(img);
      });
      img.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        runMatrix(img);
      });
    });
  })();
})();
