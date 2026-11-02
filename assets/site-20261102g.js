(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* In-page section navigation — root fix for dead #anchor clicks */
  const navOffset = () => {
    const nav = document.querySelector(".topnav");
    return (nav ? nav.offsetHeight : 60) + 10;
  };

  const scrollToId = (id, behavior) => {
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    document.body.classList.remove("nav-locked");
    const top = target.getBoundingClientRect().top + window.scrollY - navOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: behavior || (reduceMotion ? "auto" : "smooth"),
    });
    return true;
  };

  const closeDrawerIfOpen = () => {
    const nav = document.querySelector("[data-nav]");
    if (!nav || !nav.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    const toggle = nav.querySelector(".nav-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-locked");
    const backdrop = document.querySelector(".nav-backdrop");
    if (backdrop) {
      backdrop.classList.remove("is-visible");
      backdrop.hidden = true;
    }
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
    closeDrawerIfOpen();
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

  /* Mobile burger — self-contained drawer; close control is a real button hit target */
  (() => {
    const nav = document.querySelector("[data-nav]");
    if (!nav) return;

    const toggle = nav.querySelector(".nav-toggle");
    const panel = nav.querySelector(".topnav-panel");
    if (!toggle || !panel) return;

    let backdrop = document.querySelector(".nav-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "nav-backdrop";
      backdrop.hidden = true;
      document.body.appendChild(backdrop);
    }

    const mq = window.matchMedia("(max-width: 820px)");
    let lastFocus = null;

    const setOpen = (open) => {
      if (open && !mq.matches) return;
      const wasOpen = nav.classList.contains("is-open");
      if (open === wasOpen) return;

      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-locked", open && mq.matches);
      backdrop.classList.toggle("is-visible", open && mq.matches);
      backdrop.hidden = !(open && mq.matches);

      if (open) {
        lastFocus = document.activeElement;
        const focusTarget = panel.querySelector("[data-drawer-close]") || panel.querySelector("a");
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      } else if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
        lastFocus = null;
      }
    };

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (!mq.matches) return;
      setOpen(true);
    });

    panel.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-drawer-close]");
      if (closer) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      /* in-page links are handled by the document click scroll helper above */
    });

    backdrop.addEventListener("click", () => setOpen(false));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) setOpen(false);
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

  /* Case progress — fixed center highlight; track flicks so active tab sits in the middle */
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
      const nav = document.querySelector(".topnav");
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

  /* Experience timeline — smooth lerped progress line + filled/empty dots */
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
})();
