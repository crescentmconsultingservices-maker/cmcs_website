let sharedScrollVelocity = 0;
let isDrawerOpen = false;
const prefersReducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
let prefersReducedMotion = prefersReducedMotionQuery ? prefersReducedMotionQuery.matches : false;
if (prefersReducedMotionQuery && prefersReducedMotionQuery.addEventListener) {
  prefersReducedMotionQuery.addEventListener('change', (e) => {
    prefersReducedMotion = e.matches;
  });
}

// Initialize Lenis ultra-smooth momentum scrolling (disabled when prefers-reduced-motion is enabled)
let lenisInstance = null;
if (typeof Lenis !== 'undefined' && !prefersReducedMotion) {
  lenisInstance = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.5
  });
}

/**
 * Mobile section navigation toggle
 */
window.toggleMobileNav = function () {
  const menu = document.getElementById('mobile-nav-menu');
  const toggleBtn = document.getElementById('mobile-nav-toggle');
  const icon = document.getElementById('mobile-nav-icon');
  if (!menu || !toggleBtn) return;
  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    menu.classList.add('flex');
    toggleBtn.setAttribute('aria-expanded', 'true');
    if (icon) icon.textContent = 'close';
  } else {
    window.closeMobileNav();
  }
};

window.closeMobileNav = function () {
  const menu = document.getElementById('mobile-nav-menu');
  const toggleBtn = document.getElementById('mobile-nav-toggle');
  const icon = document.getElementById('mobile-nav-icon');
  if (!menu || !toggleBtn) return;
  menu.classList.add('hidden');
  menu.classList.remove('flex');
  toggleBtn.setAttribute('aria-expanded', 'false');
  if (icon) icon.textContent = 'menu';
};

/**
 * Helper to smoothly scroll to a specific mountain pass from navbar / buttons
 */
function triggerTitleAnimation(idx) {
  if (prefersReducedMotion) return;
  const titles = [
    document.querySelector('#content-0 .hero-slowmo-title'),
    document.querySelector('#content-1 .section-slowmo-title'),
    document.querySelector('#content-2 .section-slowmo-title'),
    document.querySelector('#content-3 .section-slowmo-title')
  ];
  const el = titles[idx];
  if (el) {
    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = '';
  }
}

window.scrollToMountain = function (idx) {
  if (typeof window.wakeMountainStage === 'function') window.wakeMountainStage();
  if (!prefersReducedMotion) {
    setTimeout(() => triggerTitleAnimation(idx), 200);
  }
  const sections = document.querySelectorAll('.mountain-section');
  if (sections && sections[idx]) {
    if (lenisInstance && !prefersReducedMotion) {
      lenisInstance.scrollTo(sections[idx], { duration: 1.35 });
    } else {
      sections[idx].scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }
};

/**
 * 1. High-Altitude Wind Particles Canvas
 */
(function initWindCanvas() {
  const canvas = document.getElementById('wind-canvas');
  if (!canvas) return;
  if (prefersReducedMotion) {
    canvas.style.visibility = 'hidden';
    return;
  }
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }, { passive: true });

  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.4 + 0.4,
    vx: Math.random() * 0.35 + 0.12,
    vy: (Math.random() - 0.5) * 0.14,
    alpha: Math.random() * 0.28 + 0.08
  }));

  function renderParticles() {
    if (isDrawerOpen) {
      requestAnimationFrame(renderParticles);
      return;
    }
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy - sharedScrollVelocity * 0.35;

      if (p.x > width + 10) p.x = -10;
      if (p.x < -10) p.x = width + 10;
      if (p.y > height + 10) p.y = -10;
      if (p.y < -10) p.y = height + 10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(241, 245, 249, ${p.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(renderParticles);
  }

  requestAnimationFrame(renderParticles);
})();

/**
 * 2. Scroll-Synchronized 4-Mountain Stage (1 Mountain per Section)
 */
(function initScrollMountainStage() {
  const layers = [
    document.getElementById('mountain-0'),
    document.getElementById('mountain-1'),
    document.getElementById('mountain-2'),
    document.getElementById('mountain-3')
  ];
  const contentLayers = [
    document.getElementById('content-0'),
    document.getElementById('content-1'),
    document.getElementById('content-2'),
    document.getElementById('content-3')
  ];
  const sections = Array.from(document.querySelectorAll('.mountain-section'));
  const mistMidLayer = document.getElementById('mist-mid-layer');
  const mistForeLayer = document.getElementById('mist-fore-layer');
  const navBtns = {
    1: document.getElementById('nav-btn-1'),
    2: document.getElementById('nav-btn-2'),
    3: document.getElementById('nav-btn-3')
  };

  let mouseX = 0;
  let mouseY = 0;
  let smoothMouseX = 0;
  let smoothMouseY = 0;
  let smoothStageProgress = 0;
  let lastScrollY = window.scrollY;
  let lastActiveSection = 0;
  let lastHighlightedNav = -1;
  let viewportHalfH = window.innerHeight * 0.5;
  let sectionCenters = [];
  const lastLayerOpacity = [-1, -1, -1, -1];
  const lastContentOpacity = [-1, -1, -1, -1];
  let lastActivityTime = performance.now();
  let isStageIdle = false;
  let stageRafId = null;

  function wakeStage() {
    lastActivityTime = performance.now();
    if (isStageIdle) {
      isStageIdle = false;
      stageRafId = requestAnimationFrame(animate);
    }
  }
  window.wakeMountainStage = wakeStage;

  function cacheSectionMetrics() {
    viewportHalfH = window.innerHeight * 0.5;
    sectionCenters = sections.map((sec) => sec.offsetTop + sec.offsetHeight * 0.5);
    wakeStage();
  }
  cacheSectionMetrics();
  window.addEventListener('resize', cacheSectionMetrics, { passive: true });
  window.addEventListener('scroll', wakeStage, { passive: true });
  window.addEventListener('wheel', wakeStage, { passive: true });
  window.addEventListener('touchstart', wakeStage, { passive: true });

  function smootherstep(t) {
    const c = Math.max(0, Math.min(1, t));
    return c * c * c * (c * (c * 6 - 15) + 10);
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    wakeStage();
  }, { passive: true });

  function getTargetProgress(scrollYPos) {
    if (!sectionCenters.length) return 0;
    const viewportMid = scrollYPos + viewportHalfH;
    if (viewportMid <= sectionCenters[0]) return 0;

    for (let i = 0; i < sectionCenters.length - 1; i++) {
      const centerA = sectionCenters[i];
      const centerB = sectionCenters[i + 1];
      if (viewportMid >= centerA && viewportMid <= centerB) {
        return i + (viewportMid - centerA) / Math.max(1, centerB - centerA);
      }
    }
    return sectionCenters.length - 1;
  }

  function animate(time) {
    if (lenisInstance && !isDrawerOpen) {
      lenisInstance.raf(time);
    }

    if (isDrawerOpen) {
      requestAnimationFrame(animate);
      return;
    }

    const currentScrollY = lenisInstance ? lenisInstance.scroll : window.scrollY;
    const deltaY = currentScrollY - lastScrollY;
    lastScrollY = currentScrollY;
    sharedScrollVelocity = sharedScrollVelocity * 0.86 + deltaY * 0.015;

    const targetProgress = getTargetProgress(currentScrollY);
    if (prefersReducedMotion) {
      smoothStageProgress = targetProgress;
    } else {
      smoothStageProgress += (targetProgress - smoothStageProgress) * 0.14;
    }

    smoothMouseX += (mouseX - smoothMouseX) * 0.05;
    smoothMouseY += (mouseY - smoothMouseY) * 0.05;

    const now = time || performance.now();
    const swayPhase = now * 0.00075;
    const isPortrait = window.innerHeight > window.innerWidth;
    const motionScale = prefersReducedMotion ? 0 : (isPortrait ? 0.55 : 1.0);

    // S-curve winding valley route coordinates per mountain pass
    const routeWaypoints = [
      { x: 0.0, y: 0.0, exitX: -1.8, exitY: 1.4 }, // Pass 1 (Home) -> curves left into valley
      { x: -1.5, y: -1.1, exitX: -1.4, exitY: 1.3 }, // Pass 2 (Who We Are - nvrt2u) -> curves along snow ridge
      { x: 1.6, y: -1.2, exitX: 1.9, exitY: 1.5 }, // Pass 3 (What We Can Do - xnza35) -> curves right through basalt pass
      { x: 1.2, y: -0.9, exitX: 0.0, exitY: 0.0 }  // Pass 4 (Work With Us - 9u2qau) -> settles at summit
    ];

    const breathingScale = prefersReducedMotion ? 0 : Math.sin(swayPhase) * 0.003;
    const swayX = prefersReducedMotion ? 0 : (Math.sin(swayPhase * 0.9) * 0.18 - smoothMouseX * 0.32) * motionScale;
    const swayY = prefersReducedMotion ? 0 : (Math.cos(swayPhase * 0.75) * 0.14 - smoothMouseY * 0.24) * motionScale;

    // Smooth camera route interpolation between current & next mountain pass
    const baseIdx = Math.max(0, Math.min(layers.length - 1, Math.floor(smoothStageProgress)));
    const frac = smoothStageProgress - baseIdx;
    const smoothFrac = smootherstep(frac);
    const transitionPulse = Math.sin(smoothFrac * Math.PI);

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer) continue;

      const wp = routeWaypoints[i] || { x: 0, y: 0, exitX: 0, exitY: 0 };
      const clampedDist = Math.max(-1, Math.min(1, smoothStageProgress - i));

      let opacity = 0;
      let depthScale = 1.03;
      let routeX = 0;
      let routeY = 0;

      if (clampedDist <= 0) {
        const enterT = 1 + clampedDist; // 0 -> 1
        const quinticEnter = smootherstep(enterT);
        opacity = Math.pow(quinticEnter, 0.85);
        depthScale = 0.86 + quinticEnter * 0.17 + breathingScale;
        routeX = wp.x * (1 - quinticEnter) * motionScale;
        routeY = wp.y * (1 - quinticEnter) * motionScale;
      } else {
        const exitT = clampedDist; // 0 -> 1
        const quinticExit = smootherstep(exitT);
        opacity = Math.max(0, 1 - Math.pow(quinticExit, 1.15));
        depthScale = 1.03 + quinticExit * 0.32 + breathingScale;
        routeX = wp.exitX * quinticExit * motionScale;
        routeY = wp.exitY * quinticExit * motionScale;
      }

      if (opacity > 0.001 || lastLayerOpacity[i] !== 0) {
        layer.style.opacity = opacity.toFixed(4);
        lastLayerOpacity[i] = opacity > 0.001 ? opacity : 0;
        if (opacity > 0.001) {
          layer.style.transform = `translate3d(${(swayX + routeX).toFixed(3)}%, ${(swayY + routeY).toFixed(3)}%, 0) scale(${depthScale.toFixed(4)})`;
        }
      }

      // Synchronize 3D Content Layer (materializes in place on opposite side of mountain with 3D depth)
      const content = contentLayers[i];
      if (content) {
        let cOpacity = 0;
        let cScale = 1.0;

        if (clampedDist <= 0) {
          const enterT = 1 + clampedDist;
          const qEnter = smootherstep(enterT);
          cOpacity = Math.pow(qEnter, 1.25);
          cScale = 0.92 + qEnter * 0.08;
        } else {
          const exitT = clampedDist;
          const qExit = smootherstep(exitT);
          cOpacity = Math.max(0, 1 - Math.pow(qExit, 1.25));
          cScale = 1.0 + qExit * 0.08;
        }

        if (cOpacity > 0.001 || lastContentOpacity[i] !== 0) {
          content.style.opacity = cOpacity.toFixed(4);
          lastContentOpacity[i] = cOpacity > 0.001 ? cOpacity : 0;
          if (cOpacity > 0.001) {
            content.style.transform = `scale(${cScale.toFixed(4)})`;
          }
          content.style.pointerEvents = cOpacity > 0.45 ? 'auto' : 'none';
          content.style.visibility = cOpacity > 0.02 ? 'visible' : 'hidden';
        }
      }
    }

    // Re-trigger slow-motion title rise whenever entering a new mountain pass
    const activeNavIdx = Math.round(smoothStageProgress);
    if (activeNavIdx !== lastActiveSection) {
      lastActiveSection = activeNavIdx;
      triggerTitleAnimation(activeNavIdx);
    }

    // Only update navbar DOM classes when active section actually changes (avoids 60fps style recalc)
    if (activeNavIdx !== lastHighlightedNav) {
      lastHighlightedNav = activeNavIdx;
      [1, 2, 3].forEach((idx) => {
        const btn = navBtns[idx];
        if (!btn) return;
        if (idx === activeNavIdx) {
          btn.className = 'nav-btn px-4 py-1.5 rounded-full text-white bg-white/20 border border-white/25 shadow-sm transition-all cursor-pointer';
        } else {
          btn.className = 'nav-btn px-4 py-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 border border-transparent transition-all cursor-pointer';
        }
      });
    }

    // Dynamic mist surge during valley pass transitions (creates "flying through clouds into next peak" feel)
    if (mistMidLayer) {
      const midDriftX = Math.sin(now * 0.00035) * 2.2 + swayX * 1.4;
      const midScale = 1.05 + transitionPulse * 0.08;
      mistMidLayer.style.transform = `translate3d(${midDriftX.toFixed(2)}%, ${(swayY * 1.3).toFixed(2)}%, 0) scale(${midScale.toFixed(3)})`;
      mistMidLayer.style.opacity = (0.34 + transitionPulse * 0.24).toFixed(3);
    }

    if (mistForeLayer) {
      const foreDriftX = Math.cos(now * 0.00028) * 2.8 + swayX * 1.75;
      const foreScale = 1.08 + transitionPulse * 0.12;
      mistForeLayer.style.transform = `translate3d(${foreDriftX.toFixed(2)}%, ${(swayY * 1.6).toFixed(2)}%, 0) scale(${foreScale.toFixed(3)})`;
      mistForeLayer.style.opacity = (0.20 + transitionPulse * 0.22).toFixed(3);
    }

    const settled = Math.abs(targetProgress - smoothStageProgress) < 0.0004 && Math.abs(deltaY) < 0.05 && (now - lastActivityTime > 1800);
    if (settled) {
      isStageIdle = true;
      stageRafId = null;
      return;
    }

    stageRafId = requestAnimationFrame(animate);
  }

  stageRafId = requestAnimationFrame(animate);
})();

/**
 * 3. Shared 3D Z-Axis Depth Pull Drawer Controls (Story, Capabilities, Contact)
 */
let activeDrawerId = null;
let lastFocusedElement = null;

function getFocusableElements(container) {
  if (!container) return [];
  const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter((el) => el.offsetParent !== null);
}

window.openGlassDrawer = function (drawerId) {
  const drawer = document.getElementById(drawerId);
  const panel = document.getElementById(drawerId + '-panel');
  const depthStage = document.getElementById('depth-stage');
  const windCanvas = document.getElementById('wind-canvas');
  const header = document.querySelector('header');
  const stage = document.getElementById('content-stage');
  if (!drawer || !panel) return;
  if (typeof window.closeMobileNav === 'function') window.closeMobileNav();
  lastFocusedElement = document.activeElement;
  activeDrawerId = drawerId;
  isDrawerOpen = true;
  if (lenisInstance) lenisInstance.stop();
  if (windCanvas) windCanvas.style.visibility = 'hidden';
  if (header) header.style.opacity = '0';
  if (stage) stage.style.opacity = '0';
  if (depthStage) depthStage.classList.add('depth-receded');
  panel.classList.add('will-change-transform');
  drawer.classList.remove('hidden');
  drawer.classList.add('flex');
  document.body.style.overflow = 'hidden';
  panel.scrollTop = 0;
  void drawer.offsetHeight; // Force clean reflow so CSS transition always animates smoothly
  requestAnimationFrame(() => {
    drawer.classList.remove('opacity-0');
    panel.classList.remove('scale-[0.78]', 'blur-[10px]', 'opacity-0');
    const focusables = getFocusableElements(drawer);
    if (focusables.length > 0) {
      focusables[0].focus({ preventScroll: true });
    }
  });
  setTimeout(() => {
    if (activeDrawerId === drawerId) {
      panel.classList.remove('will-change-transform');
    }
  }, prefersReducedMotion ? 0 : 650);
};

window.closeGlassDrawer = function (drawerId) {
  const targetId = drawerId || activeDrawerId;
  if (!targetId) return;
  const drawer = document.getElementById(targetId);
  const panel = document.getElementById(targetId + '-panel');
  const depthStage = document.getElementById('depth-stage');
  const windCanvas = document.getElementById('wind-canvas');
  const header = document.querySelector('header');
  const stage = document.getElementById('content-stage');
  if (!drawer || !panel) return;
  panel.classList.add('will-change-transform');
  drawer.classList.add('opacity-0');
  panel.classList.add('scale-[0.78]', 'blur-[10px]', 'opacity-0');
  if (depthStage) depthStage.classList.remove('depth-receded');
  if (header) header.style.opacity = '';
  if (stage) stage.style.opacity = '';
  document.body.style.overflow = '';
  setTimeout(() => {
    drawer.classList.remove('flex');
    drawer.classList.add('hidden');
    panel.classList.remove('will-change-transform');
    if (activeDrawerId === targetId) activeDrawerId = null;
    isDrawerOpen = false;
    if (windCanvas && !prefersReducedMotion) windCanvas.style.visibility = '';
    if (lenisInstance) lenisInstance.start();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus({ preventScroll: true });
      lastFocusedElement = null;
    }
  }, prefersReducedMotion ? 0 : 520);
};

window.openStoryDrawer = function () { openGlassDrawer('story-drawer'); };
window.closeStoryDrawer = function () { closeGlassDrawer('story-drawer'); };

let isJobApplicationMode = false;
const resumeFileInput = document.getElementById('drawer-resume-file');
const resumeFilenameEl = document.getElementById('drawer-resume-filename');

if (resumeFileInput && resumeFilenameEl) {
  resumeFileInput.addEventListener('change', () => {
    const file = resumeFileInput.files && resumeFileInput.files[0];
    if (!file) {
      resumeFilenameEl.textContent = 'Choose PDF or Word file...';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      resumeFileInput.value = '';
      resumeFilenameEl.textContent = 'File exceeds 5MB limit. Choose a smaller file.';
      return;
    }
    const kb = Math.max(1, Math.round(file.size / 1024));
    resumeFilenameEl.textContent = `${file.name} (${kb} KB)`;
  });
}

window.openContactDrawer = function (isJobMode, subjectText) {
  isJobApplicationMode = !!isJobMode;
  const titleEl = document.getElementById('contact-drawer-title');
  const subEl = document.getElementById('contact-drawer-sub');
  const resumeWrap = document.getElementById('drawer-resume-wrap');
  const resumeInput = document.getElementById('drawer-resume');
  const msgLabel = document.getElementById('drawer-message-label');
  const msgInput = document.getElementById('drawer-message');
  const subjectInput = document.getElementById('drawer-subject');
  const submitText = document.getElementById('drawer-submit-text');

  if (isJobApplicationMode) {
    if (titleEl) titleEl.innerHTML = 'Apply for this engineering role<span class="text-[#C59A3F]">.</span>';
    if (subEl) subEl.textContent = 'Upload your resume (PDF/DOCX) directly to our engineering leadership.';
    if (resumeWrap) resumeWrap.classList.remove('hidden');
    if (resumeFileInput) resumeFileInput.required = true;
    if (msgLabel) msgLabel.textContent = 'Experience & Cover Note';
    if (msgInput) msgInput.placeholder = 'Share your years of experience, core tech stack, notice period, and key work...';
    if (subjectInput && subjectText) subjectInput.value = subjectText;
    if (submitText) submitText.textContent = 'Submit Application';
  } else {
    if (titleEl) titleEl.innerHTML = 'Build the future of technology together<span class="text-[#C59A3F]">.</span>';
    if (subEl) subEl.textContent = 'Send a message directly to our senior engineering leadership in Erode, India.';
    if (resumeWrap) resumeWrap.classList.add('hidden');
    if (resumeFileInput) { resumeFileInput.required = false; resumeFileInput.value = ''; }
    if (resumeFilenameEl) resumeFilenameEl.textContent = 'Choose PDF or Word file...';
    if (resumeInput) resumeInput.value = '';
    if (msgLabel) msgLabel.textContent = 'Project Details';
    if (msgInput) msgInput.placeholder = 'Tell us about your project goals, timeline, and engineering needs...';
    if (subjectInput && !subjectText) subjectInput.value = '';
    if (submitText) submitText.textContent = 'Send Message';
  }
  openGlassDrawer('contact-drawer');
};

window.applyForRole = function (roleSubject) {
  closeGlassDrawer('careers-drawer');
  setTimeout(() => {
    openContactDrawer(true, roleSubject);
  }, 540);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeDrawerId) {
    closeGlassDrawer(activeDrawerId);
    return;
  }
  if (e.key === 'Tab' && activeDrawerId) {
    const drawer = document.getElementById(activeDrawerId);
    const focusables = getFocusableElements(drawer);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !drawer.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !drawer.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});

// Contact Drawer Form Submission -> POST /send_mail.php
const drawerContactForm = document.getElementById('drawer-contact-form');
if (drawerContactForm) {
  drawerContactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('drawer-submit-btn');
    const btnText = document.getElementById('drawer-submit-text');
    const statusBox = document.getElementById('drawer-form-status');
    const resumeInput = document.getElementById('drawer-resume');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Sending...';
    if (statusBox) statusBox.classList.add('hidden');

    try {
      const formData = new FormData(drawerContactForm);
      if (isJobApplicationMode && resumeInput && resumeInput.value.trim()) {
        formData.set('message', (formData.get('message') || '') + '\n\nResume / Portfolio URL: ' + resumeInput.value.trim());
      }
      const res = await fetch('send_mail.php', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (statusBox) {
        statusBox.className = res.ok && data.success
          ? 'text-xs sm:text-sm px-4 py-3 rounded-xl border bg-white/15 border-white/30 text-white backdrop-blur-md'
          : 'text-xs sm:text-sm px-4 py-3 rounded-xl border bg-rose-500/15 border-rose-400/30 text-rose-200';
        statusBox.textContent = data.message || 'Message sent.';
      }
      if (res.ok && data.success) {
        drawerContactForm.reset();
        if (resumeFilenameEl) resumeFilenameEl.textContent = 'Choose PDF or Word file...';
      }
    } catch (err) {
      if (statusBox) {
        statusBox.className = 'text-xs sm:text-sm px-4 py-3 rounded-xl border bg-rose-500/15 border-rose-400/30 text-rose-200';
        statusBox.textContent = 'Unable to send right now. Please email ravindran.p@crescentmoon.ai directly.';
      }
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = isJobApplicationMode ? 'Submit Application' : 'Send Message';
    }
  });
}
