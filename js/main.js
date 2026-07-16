/* Journal book — one soft page at a time (StPageFlip) */
(function () {
  "use strict";

  var bookEl = document.getElementById("book");
  var bookWrap = document.getElementById("book-wrap");
  var flipPrevBtn = document.getElementById("flip-prev");
  var flipNextBtn = document.getElementById("flip-next");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".book-tab"));
  var pageEls = Array.prototype.slice.call(document.querySelectorAll("#book .page"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pageFlip = null;
  var flipping = false;
  var pageNames = ["intro", "now", "projects", "experience", "awards", "links"];

  if (!bookEl || !bookWrap || typeof St === "undefined" || !St.PageFlip) {
    console.error("StPageFlip failed to load");
    return;
  }

  function pageFromHash() {
    var hash = (location.hash || "").replace(/^#/, "").toLowerCase();
    if (!hash) return 0;
    var byName = pageNames.indexOf(hash);
    if (byName >= 0) return byName;
    // aliases
    if (hash === "about") return 0;
    if (hash === "experiences") return 3;
    if (hash === "contact") return 5;
    var n = Number(hash);
    if (!isNaN(n) && n >= 0 && n < pageEls.length) return n;
    return 0;
  }

  function syncHash(index) {
    var name = pageNames[index] || "intro";
    var next = "#" + name;
    if (location.hash !== next) {
      history.replaceState(null, "", next);
    }
  }

  function updateChrome(index) {
    tabs.forEach(function (tab) {
      tab.classList.toggle("is-active", Number(tab.getAttribute("data-tab")) === index);
    });
    if (flipPrevBtn) flipPrevBtn.disabled = index <= 0;
    if (flipNextBtn) flipNextBtn.disabled = index >= pageEls.length - 1;
    syncHash(index);
  }

  function unlockPageScroll() {
    pageEls.forEach(function (page) {
      page.style.display = "flex";
      page.style.flexDirection = "column";
      page.style.overflow = "hidden";
      var body = page.querySelector(".page__body");
      if (body) {
        body.style.overflowY = "auto";
        body.style.minHeight = "0";
        body.style.flex = "1 1 auto";
      }
    });
  }

  function clearFlipLock() {
    flipping = false;
    bookWrap.classList.remove("is-flipping");
  }

  // Animated flip-back is broken when disableFlipByClick is true (StPageFlip #29).
  // Use turnToPage / turnToPrevPage for reliable backward + tab navigation.
  function flipForward() {
    if (!pageFlip) return;
    var cur = pageFlip.getCurrentPageIndex();
    if (cur >= pageEls.length - 1) return;
    clearFlipLock();
    if (reduceMotion) {
      pageFlip.turnToNextPage();
      afterTurn(pageFlip.getCurrentPageIndex());
    } else {
      pageFlip.flipNext("bottom");
    }
  }

  function flipBack() {
    if (!pageFlip) return;
    var cur = pageFlip.getCurrentPageIndex();
    if (cur <= 0) return;
    clearFlipLock();
    pageFlip.turnToPrevPage();
    afterTurn(pageFlip.getCurrentPageIndex());
  }

  function afterTurn(index) {
    updateChrome(index);
    unlockPageScroll();
    scrollActivePageTop(index);
  }

  function goTo(next) {
    if (!pageFlip) return;
    next = Number(next);
    var cur = pageFlip.getCurrentPageIndex();
    if (next === cur || next < 0 || next >= pageEls.length) return;

    clearFlipLock();

    // Forward by one page can animate; anything else (including all back jumps) turns instantly
    if (next === cur + 1 && !reduceMotion) {
      pageFlip.flipNext("bottom");
      return;
    }

    pageFlip.turnToPage(next);
    afterTurn(next);
  }

  function measureBook() {
    var w = Math.round(bookWrap.clientWidth);
    var h = Math.round(bookWrap.clientHeight);
    return {
      width: Math.max(280, w),
      height: Math.max(360, h)
    };
  }

  function initFlip() {
    var size = measureBook();

    // minWidth >= container width forces portrait (one page), never a two-page spread
    pageFlip = new St.PageFlip(bookEl, {
      width: size.width,
      height: size.height,
      size: "stretch",
      minWidth: size.width,
      maxWidth: size.width,
      minHeight: size.height,
      maxHeight: size.height,
      drawShadow: true,
      flippingTime: reduceMotion ? 1 : 1100,
      usePortrait: true,
      startZIndex: 2,
      autoSize: false,
      maxShadowOpacity: 0.5,
      showCover: false,
      mobileScrollSupport: true,
      swipeDistance: 60,
      clickEventForward: true,
      useMouseEvents: true,
      showPageCorners: true,
      disableFlipByClick: true,
      startPage: pageFromHash()
    });

    pageFlip.loadFromHTML(pageEls);

    unlockPageScroll();

    pageFlip.on("flip", function (e) {
      afterTurn(e.data);
      clearFlipLock();
    });

    pageFlip.on("changeState", function (e) {
      var state = e.data;
      flipping = state === "flipping" || state === "user_fold";
      bookWrap.classList.toggle("is-flipping", flipping || state === "fold_corner");
      if (state === "read") {
        clearFlipLock();
        unlockPageScroll();
      }
    });

    pageFlip.on("init", function (e) {
      updateChrome(e.data.page);
      requestAnimationFrame(function () {
        pageFlip.update();
        unlockPageScroll();
      });
    });

    // Let wheel / trackpad scroll the page body
    bookEl.addEventListener(
      "wheel",
      function (e) {
        var body = e.target.closest && e.target.closest(".page__body");
        if (!body) return;
        e.stopPropagation();
      },
      { passive: true, capture: true }
    );

    // Touch: allow vertical scroll inside page body without starting a flip
    bookEl.addEventListener(
      "touchstart",
      function (e) {
        if (!(e.target.closest && e.target.closest(".page__body"))) return;
        e.stopPropagation();
      },
      { capture: true, passive: true }
    );

    updateChrome(pageFromHash());
  }

  window.addEventListener("hashchange", function () {
    goTo(pageFromHash());
  });

  function scrollActivePageTop(index) {
    var page = pageEls[index];
    if (!page) return;
    var body = page.querySelector(".page__body");
    if (body) body.scrollTop = 0;
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (e) {
      e.stopPropagation();
      goTo(Number(tab.getAttribute("data-tab")));
    });
  });

  document.querySelectorAll("[data-go-tab]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      goTo(Number(el.getAttribute("data-go-tab")));
    });
  });

  if (flipPrevBtn) {
    flipPrevBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      flipBack();
    });
  }

  if (flipNextBtn) {
    flipNextBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      flipForward();
    });
  }

  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (!pageFlip) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      flipForward();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      flipBack();
    }
  });

  initFlip();

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!pageFlip) return;
      pageFlip.update();
    }, 160);
  });
})();

/* Interactive starfield — denser, reacts to cursor */
(function () {
  "use strict";

  var canvas = document.getElementById("field-stars");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var stars = [];
  var reduceStars = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pointer = { x: -9999, y: -9999, active: false };
  var ripples = [];
  var RADIUS = 180;
  var LINK_DIST = 120;

  function resizeStars() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = [];
    var count = Math.min(380, Math.max(180, Math.floor((canvas.width * canvas.height) / 5500)));
    for (var i = 0; i < count; i++) {
      var x = Math.random() * canvas.width;
      var y = Math.random() * canvas.height;
      stars.push({
        ox: x,
        oy: y,
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        r: Math.random() * 1.9 + 0.35,
        base: Math.random() * 0.42 + 0.28,
        glow: Math.random() * 14 + 6,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.1 + 0.2,
        drift: Math.random() * 0.4 + 0.08
      });
    }
  }

  function onPointer(e) {
    var touch = e.touches && e.touches[0];
    pointer.x = touch ? touch.clientX : e.clientX;
    pointer.y = touch ? touch.clientY : e.clientY;
    pointer.active = true;
  }

  function onLeave() {
    pointer.active = false;
  }

  function onTap(e) {
    var touch = e.changedTouches && e.changedTouches[0];
    ripples.push({
      x: touch ? touch.clientX : e.clientX,
      y: touch ? touch.clientY : e.clientY,
      life: 1
    });
    if (ripples.length > 8) ripples.shift();
  }

  window.addEventListener("mousemove", onPointer, { passive: true });
  window.addEventListener("touchmove", onPointer, { passive: true });
  window.addEventListener("mouseleave", onLeave);
  window.addEventListener("click", onTap, { passive: true });
  window.addEventListener("touchend", onTap, { passive: true });

  function drawStars(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var t = (time || 0) * 0.001;
    var near = [];

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var influence = 0;

      if (pointer.active && !reduceStars) {
        var dx = s.x - pointer.x;
        var dy = s.y - pointer.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < RADIUS && dist > 0.1) {
          influence = 1 - dist / RADIUS;
          var force = influence * 1.15;
          s.vx += (dx / dist) * force;
          s.vy += (dy / dist) * force;
          near.push(s);
        }
      }

      s.vx += (s.ox - s.x) * 0.014;
      s.vy += (s.oy - s.y) * 0.014;
      s.vx *= 0.84;
      s.vy *= 0.84;

      if (!reduceStars) {
        s.x += s.vx + Math.sin(t * s.drift + s.phase) * 0.1;
        s.y += s.vy + Math.cos(t * s.drift * 0.85 + s.phase) * 0.1;
      }

      var rippleBoost = 0;
      for (var r = 0; r < ripples.length; r++) {
        var rip = ripples[r];
        var rdx = s.x - rip.x;
        var rdy = s.y - rip.y;
        var rd = Math.sqrt(rdx * rdx + rdy * rdy);
        var band = Math.abs(rd - (1 - rip.life) * 260);
        if (band < 48) rippleBoost += (1 - band / 48) * rip.life * 0.9;
      }

      var pulse = reduceStars ? 1 : 0.6 + 0.4 * Math.sin(t * s.speed + s.phase);
      var alpha = Math.min(1, s.base * pulse + influence * 0.65 + rippleBoost);

      ctx.beginPath();
      ctx.fillStyle = "rgba(56, 140, 255," + (alpha * 0.24) + ")";
      ctx.shadowColor = "rgba(80, 160, 255," + (alpha * 0.95) + ")";
      ctx.shadowBlur = s.glow + influence * 16;
      ctx.arc(s.x, s.y, s.r * (1.7 + influence * 1.4), 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "rgba(170, 215, 255," + alpha + ")";
      ctx.shadowColor = "rgba(130, 195, 255," + alpha + ")";
      ctx.shadowBlur = s.glow * 0.55 + influence * 10;
      ctx.arc(s.x, s.y, s.r * (0.5 + influence * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }

    if (pointer.active && near.length > 1 && !reduceStars) {
      ctx.shadowBlur = 0;
      for (var a = 0; a < near.length; a++) {
        for (var b = a + 1; b < near.length; b++) {
          var s1 = near[a];
          var s2 = near[b];
          var lx = s1.x - s2.x;
          var ly = s1.y - s2.y;
          var ld = Math.sqrt(lx * lx + ly * ly);
          if (ld < LINK_DIST) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(130, 190, 255," + (1 - ld / LINK_DIST) * 0.4 + ")";
            ctx.lineWidth = 1;
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
          }
        }
      }
    }

    if (pointer.active && !reduceStars) {
      var g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, RADIUS);
      g.addColorStop(0, "rgba(100, 170, 255, 0.1)");
      g.addColorStop(1, "rgba(100, 170, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      ripples[ri].life -= 0.018;
      if (ripples[ri].life <= 0) ripples.splice(ri, 1);
    }

    ctx.shadowBlur = 0;
    if (!reduceStars) requestAnimationFrame(drawStars);
  }

  resizeStars();
  drawStars(0);
  window.addEventListener("resize", function () {
    resizeStars();
    if (reduceStars) drawStars(0);
  });
})();
