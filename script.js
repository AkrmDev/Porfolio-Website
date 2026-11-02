const bands = document.querySelectorAll(".band");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
    });
  },
  { threshold: 0.15 }
);

bands.forEach((band) => observer.observe(band));

/* Keep mailto/tel literal — avoid sanitizers rewriting contact anchors */
document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach((link) => {
  link.setAttribute("rel", "noopener noreferrer");
});

/* External http(s) links open in a new tab */
document.querySelectorAll('a[href^="http://"], a[href^="https://"]').forEach((link) => {
  try {
    if (link.hostname === window.location.hostname) return;
  } catch (_) {
    /* ignore */
  }
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
});

/* Mobile burger menu */
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

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-locked", open && mq.matches);
    backdrop.classList.toggle("is-visible", open && mq.matches);
    backdrop.hidden = !(open && mq.matches);
    toggle.querySelector(".nav-toggle-label").textContent = open ? "Close" : "Menu";
  };

  toggle.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

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
