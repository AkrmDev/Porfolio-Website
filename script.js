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

    /* Bind close on the button itself; icon has pointer-events: none */
    panel.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-drawer-close]");
      if (closer) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        return;
      }
      const link = event.target.closest("a");
      if (link && mq.matches) setOpen(false);
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
      if (index === activeIndex) {
        centerTrackOn(index, false);
        return;
      }
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

  /* Experience timeline — coral progress line + item reveal while scrolling */
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

    if (reduceMotion) {
      items.forEach((item) => item.classList.add("is-inview"));
      progressEl.style.height = `${Math.max(0, list.offsetHeight - 8)}px`;
      return;
    }

    const itemObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-inview");
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -10% 0px" }
    );
    items.forEach((item) => itemObserver.observe(item));

    let ticking = false;
    const updateLine = () => {
      ticking = false;
      const rect = wrap.getBoundingClientRect();
      const trackH = Math.max(0, list.offsetHeight - 8);
      const start = rect.top + window.scrollY;
      const end = start + trackH;
      const view = window.scrollY + window.innerHeight * 0.55;
      const raw = (view - start) / Math.max(1, end - start);
      const pct = Math.max(0, Math.min(1, raw));
      progressEl.style.height = `${pct * trackH}px`;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateLine);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateLine();
  })();
})();
