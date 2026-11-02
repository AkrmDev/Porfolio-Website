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
