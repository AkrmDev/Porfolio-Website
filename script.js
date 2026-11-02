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

  /* Mobile burger — self-contained drawer (open via hamburger; close via X / backdrop / Esc / link) */
  (() => {
    const nav = document.querySelector("[data-nav]");
    if (!nav) return;

    const toggle = nav.querySelector(".nav-toggle");
    const panel = nav.querySelector(".topnav-panel");
    const closeBtn = nav.querySelector(".drawer-close");
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
      if (!mq.matches && open) return;
      const wasOpen = nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-locked", open && mq.matches);
      backdrop.classList.toggle("is-visible", open && mq.matches);
      backdrop.hidden = !(open && mq.matches);

      if (open && !wasOpen) {
        lastFocus = document.activeElement;
        const focusTarget = closeBtn || panel.querySelector("a");
        if (focusTarget) focusTarget.focus();
      } else if (!open && wasOpen && lastFocus) {
        lastFocus.focus();
        lastFocus = null;
      }
    };

    toggle.addEventListener("click", () => {
      if (!mq.matches) return;
      setOpen(true);
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => setOpen(false));
    }

    backdrop.addEventListener("click", () => setOpen(false));

    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mq.matches) setOpen(false);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
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

  /* Case progress — scroll-lerped sliding pill (no IntersectionObserver tab jumping) */
  (() => {
    const progress = document.querySelector(".case-progress");
    if (!progress) return;

    const track = progress.querySelector(".case-progress-track") || progress;
    const pill = progress.querySelector(".case-progress-pill");
    const links = [...progress.querySelectorAll("a[href^='#']")];
    if (!links.length || !pill) return;

    const sections = links
      .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
      .filter(Boolean);
    if (sections.length !== links.length) return;

    let activeId = null;
    let clicking = false;
    let ticking = false;
    let pillX = 0;
    let pillW = 0;

    const navOffset = () => {
      const nav = document.querySelector(".topnav");
      return (nav ? nav.offsetHeight : 60) + 12;
    };

    const sectionTops = () =>
      sections.map((section) => section.getBoundingClientRect().top + window.scrollY);

    const placePill = (x, w, immediate) => {
      pillX = x;
      pillW = w;
      pill.style.width = `${w}px`;
      if (immediate || reduceMotion) {
        pill.style.transition = "none";
        pill.style.transform = `translate3d(${x}px, -50%, 0)`;
        return;
      }
      pill.style.transition = "transform 0.18s linear, width 0.18s linear";
      pill.style.transform = `translate3d(${x}px, -50%, 0)`;
    };

    const revealTab = (link) => {
      if (!link) return;
      const left = link.offsetLeft;
      const right = left + link.offsetWidth;
      const viewLeft = progress.scrollLeft;
      const viewRight = viewLeft + progress.clientWidth;
      const pad = 28;
      if (left < viewLeft + pad) progress.scrollLeft = Math.max(0, left - pad);
      else if (right > viewRight - pad) progress.scrollLeft = right - progress.clientWidth + pad;
    };

    const setActiveLabel = (id) => {
      if (!id || id === activeId) return;
      activeId = id;
      let active = null;
      links.forEach((link) => {
        const on = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", on);
        if (on) active = link;
      });
      revealTab(active);
    };

    const updateFromScroll = () => {
      ticking = false;
      if (clicking) return;

      const tops = sectionTops();
      const marker = window.scrollY + navOffset();
      let index = 0;
      for (let i = 0; i < tops.length; i += 1) {
        if (marker >= tops[i] - 1) index = i;
      }

      const current = links[index];
      const next = links[Math.min(index + 1, links.length - 1)];
      const start = tops[index];
      const end = index < tops.length - 1 ? tops[index + 1] : start + sections[index].offsetHeight;
      const span = Math.max(1, end - start);
      const t = Math.max(0, Math.min(1, (marker - start) / span));

      const x1 = current.offsetLeft;
      const w1 = current.offsetWidth;
      const x2 = next.offsetLeft;
      const w2 = next.offsetWidth;
      const x = x1 + (x2 - x1) * t;
      const w = w1 + (w2 - w1) * t;
      placePill(x, w, false);
      setActiveLabel(sections[index].id);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateFromScroll);
    };

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const id = link.getAttribute("href").slice(1);
        const section = document.getElementById(id);
        if (!section) return;
        event.preventDefault();
        clicking = true;
        setActiveLabel(id);
        placePill(link.offsetLeft, link.offsetWidth, false);
        const top = section.getBoundingClientRect().top + window.scrollY - navOffset();
        window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        window.setTimeout(() => {
          clicking = false;
          updateFromScroll();
        }, reduceMotion ? 40 : 700);
      });
    });

    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    placePill(links[0].offsetLeft, links[0].offsetWidth, true);
    setActiveLabel(sections[0].id);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      placePill(pillX || links[0].offsetLeft, pillW || links[0].offsetWidth, true);
      updateFromScroll();
    }, { passive: true });
    updateFromScroll();
  })();
})();
