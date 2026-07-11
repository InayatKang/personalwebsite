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

  if (!bookEl || !bookWrap || typeof St === "undefined" || !St.PageFlip) {
    console.error("StPageFlip failed to load");
    return;
  }

  function updateChrome(index) {
    tabs.forEach(function (tab) {
      tab.classList.toggle("is-active", Number(tab.getAttribute("data-tab")) === index);
    });
    if (flipPrevBtn) flipPrevBtn.disabled = index <= 0;
    if (flipNextBtn) flipNextBtn.disabled = index >= pageEls.length - 1;
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
      startPage: 0
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

    updateChrome(0);
  }

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

  var canvas = document.getElementById("field-stars");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var stars = [];
    var reduceStars = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resizeStars() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = [];
      var count = Math.min(160, Math.max(80, Math.floor((canvas.width * canvas.height) / 12000)));
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.6 + 0.5,
          base: Math.random() * 0.45 + 0.35,
          glow: Math.random() * 10 + 8,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.7 + 0.3
        });
      }
    }

    function drawStars(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var t = (time || 0) * 0.001;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var pulse = reduceStars ? 1 : 0.7 + 0.3 * Math.sin(t * s.speed + s.phase);
        var a = s.base * pulse;

        // Soft blue halo
        ctx.beginPath();
        ctx.fillStyle = "rgba(56, 140, 255," + (a * 0.22) + ")";
        ctx.shadowColor = "rgba(80, 160, 255," + (a * 0.85) + ")";
        ctx.shadowBlur = s.glow;
        ctx.arc(s.x, s.y, s.r * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Brighter blue core
        ctx.beginPath();
        ctx.fillStyle = "rgba(140, 200, 255," + a + ")";
        ctx.shadowColor = "rgba(100, 180, 255," + a + ")";
        ctx.shadowBlur = s.glow * 0.55;
        ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
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
  }

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
