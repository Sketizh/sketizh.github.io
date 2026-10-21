(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const audio = document.getElementById("background-audio");
  const entryScreen = document.getElementById("entry-screen");
  const player = document.getElementById("music-player");
  const playButton = document.getElementById("music-toggle");
  const progress = document.getElementById("music-progress");
  const currentTimeLabel = document.getElementById("music-current");
  const durationLabel = document.getElementById("music-duration");
  const volumeButton = document.getElementById("volume-toggle");
  const volumeRange = document.getElementById("volume-range");
  const stateLabel = document.getElementById("music-state");
  const toast = document.getElementById("toast");
  const pfp = document.getElementById("profile-image");
  const pfpPlaceholder = document.getElementById("profile-placeholder");
  const pfpWrap = document.querySelector(".profile-image-wrap");
  const hero = document.querySelector(".hero");
  const rotatingTagline = document.getElementById("rotating-tagline");
  const scrollFill = document.getElementById("scroll-progress-fill");
  let toastTimer = 0;
  let previousVolume = 0.35;

  // Keep the profile area graceful until assets/pfp.png is added.
  const showPfpFallback = () => {
    pfp.classList.add("is-missing");
    pfpPlaceholder.hidden = false;
  };
  pfpPlaceholder.hidden = true;
  pfp.addEventListener("error", showPfpFallback);
  if (pfp.complete && pfp.naturalWidth === 0) showPfpFallback();
  pfp.addEventListener("load", () => {
    pfp.classList.remove("is-missing");
    pfpPlaceholder.hidden = true;
  });

  // Let the profile image subtly follow the pointer without leaving its frame.
  if (pfpWrap && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    let pfpMovePending = false;
    let pfpX = 0;
    let pfpY = 0;
    pfpWrap.addEventListener("pointermove", (event) => {
      const bounds = pfpWrap.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      pfpX = Math.max(-1, Math.min(1, x)) * 6;
      pfpY = Math.max(-1, Math.min(1, y)) * 6;
      if (!pfpMovePending) {
        window.requestAnimationFrame(() => {
          pfpWrap.style.setProperty("--pfp-x", `${pfpX.toFixed(2)}px`);
          pfpWrap.style.setProperty("--pfp-y", `${pfpY.toFixed(2)}px`);
          pfpMovePending = false;
        });
        pfpMovePending = true;
      }
      pfpWrap.classList.add("is-pointer-tracking");
    });
    pfpWrap.addEventListener("pointerleave", () => {
      pfpWrap.classList.remove("is-pointer-tracking");
      pfpWrap.style.setProperty("--pfp-x", "0px");
      pfpWrap.style.setProperty("--pfp-y", "0px");
    });
  }

  // Cycle through the short, changing tagline beneath the main title.
  if (rotatingTagline && !reduceMotion) {
    const taglines = ["Xavier.", "@sketizh", "A god.", "Sweet."];
    let taglineIndex = 0;
    window.setInterval(() => {
      rotatingTagline.classList.add("is-changing");
      window.setTimeout(() => {
        taglineIndex = (taglineIndex + 1) % taglines.length;
        rotatingTagline.textContent = taglines[taglineIndex];
        window.requestAnimationFrame(() => rotatingTagline.classList.remove("is-changing"));
      }, 230);
    }, 2300);
  }

  // Reveal content as it enters the viewport.
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -25px 0px" });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // Follow the page's scroll position with a very thin progress line.
  let scrollPending = false;
  const updateScrollProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const amount = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    scrollFill.style.width = `${amount}%`;
    if (hero && !reduceMotion) {
      const fadeDistance = Math.max(320, Math.min(window.innerHeight * 0.8, 560));
      const fade = Math.min(1, Math.max(0, window.scrollY / fadeDistance));
      hero.style.opacity = String(1 - fade * 0.76);
      hero.style.transform = `translate3d(0, ${(-fade * 22).toFixed(2)}px, 0)`;
    }
    scrollPending = false;
  };
  window.addEventListener("scroll", () => {
    if (!scrollPending) {
      window.requestAnimationFrame(updateScrollProgress);
      scrollPending = true;
    }
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (!scrollPending) {
      window.requestAnimationFrame(updateScrollProgress);
      scrollPending = true;
    }
  }, { passive: true });
  updateScrollProgress();

  // Keep the Home / Links navigation in sync with the visible section.
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const sections = [...document.querySelectorAll("main section[id]")];
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  };

  const notify = (message) => {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
  };

  const setPlaying = (playing) => {
    player.classList.toggle("is-playing", playing);
    playButton.setAttribute("aria-pressed", String(playing));
    playButton.setAttribute("aria-label", playing ? "Pause music" : "Play music");
    stateLabel.textContent = playing ? "· Playing" : "· Paused";
  };

  const updateTime = () => {
    const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0;
    currentTimeLabel.textContent = formatTime(audio.currentTime);
    if (hasDuration) {
      durationLabel.textContent = formatTime(audio.duration);
      const value = (audio.currentTime / audio.duration) * 100;
      progress.value = String(value);
      progress.style.setProperty("--played", `${value}%`);
    } else {
      progress.value = "0";
      progress.style.setProperty("--played", "0%");
    }
  };

  playButton.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch (error) {
        setPlaying(false);
        notify("Add assets/song.mp3 to enable music.");
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  });

  audio.volume = Number(volumeRange.value) || 0.35;

  // The entry screen provides a clear user gesture so music can start on arrival.
  // Browsers may still reject playback (for example, if the audio file is missing).
  if (entryScreen) {
    let hasEntered = false;
    const enterWebsite = () => {
      if (hasEntered) return;
      hasEntered = true;

      // Call play directly inside the click handler to satisfy browser autoplay rules.
      let playback;
      try {
        playback = audio.play();
      } catch (error) {
        playback = Promise.reject(error);
      }

      entryScreen.classList.add("is-entering");
      window.setTimeout(() => entryScreen.remove(), 750);

      if (playback && typeof playback.then === "function") {
        playback.then(() => {
          setPlaying(true);
        }).catch(() => {
          setPlaying(false);
          notify("Music couldn't start. Use the play button to try again.");
        });
      }
    };

    entryScreen.addEventListener("click", enterWebsite);
  }

  volumeRange.addEventListener("input", () => {
    audio.volume = Number(volumeRange.value);
    if (audio.volume > 0) previousVolume = audio.volume;
    volumeButton.classList.toggle("is-muted", audio.volume === 0);
    volumeButton.setAttribute("aria-label", audio.volume === 0 ? "Unmute music" : "Mute music");
  });

  volumeButton.addEventListener("click", () => {
    if (audio.volume > 0) {
      previousVolume = audio.volume;
      audio.volume = 0;
      volumeRange.value = "0";
    } else {
      audio.volume = previousVolume || 0.35;
      volumeRange.value = String(audio.volume);
    }
    volumeButton.classList.toggle("is-muted", audio.volume === 0);
    volumeButton.setAttribute("aria-label", audio.volume === 0 ? "Unmute music" : "Mute music");
  });

  progress.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      notify("The track is still loading.");
      return;
    }
    audio.currentTime = (Number(progress.value) / 100) * audio.duration;
    progress.style.setProperty("--played", `${progress.value}%`);
    updateTime();
  });

  audio.addEventListener("loadedmetadata", updateTime);
  audio.addEventListener("durationchange", updateTime);
  audio.addEventListener("timeupdate", updateTime);
  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("ended", () => setPlaying(false));
  audio.addEventListener("error", () => setPlaying(false));

  // Make same-page navigation smooth while respecting reduced-motion preferences.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      const target = hash ? document.querySelector(hash) : null;
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", hash);
    });
  });
})();
