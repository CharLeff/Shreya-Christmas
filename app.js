/* ============================
   Christmas Jeopardy App (v1)
   - 5 categories x 5 values
   - No penalty for skipping
   - Unlock letter at >= $2000
   - Persists in localStorage
   ============================ */

(() => {
  const GOAL = 10000;
  const VALUES = [200, 400, 600, 800, 1000];

  // ✅ Edit everything here
  // Placeholders are labeled clearly.
  const BOARD = {
    categories: [
      {
        name: "Trips",
        tiles: [
          { q: "How did you pick Charlie up on our first trip?", a: "Took BART to SFO", hint: "" },
          { q: "Best Trip?", a: "Freebie (your choice)", hint: "" },
          { q: "When and where did we have our first magical mushroom experience togeter?", a: "Albany, hiking the hill behind Julie's place", hint: "" },
          { q: "Charlie once (stupidly) planned his trip to end a week after the day he thought it was ending. What day was that?", a: "Monday", hint: "" },
          { q: "How many trips have we had (± 2)?", a: "12", hint: "" },
        ],
      },
      {
        name: "Early Moments",
        tiles: [
          { q: "What year did we have our first conversation?", a: "2017", hint: "" },
          { q: "In what car did Charlie first pick you up?", a: "Charlie's Chevy Volt", hint: "" },
          { q: "Where did we have our first group hangout?", a: "Library & Luna's basement", hint: "" },
          { q: "What three guys did shreya rotate between in highschool?", a: "Charlie, Morgan(a), Brian", hint: "" },
          { q: "What values did charlie say he had in highschool, and what values did shreya say she had?", a: "Republican, christian", hint: "" },
        ],
      },
      {
        name: "Inside Jokes",
        tiles: [
          { q: "Where does Charlie plan on proposing?", a: "Harry Potter world", hint: "" },
          { q: "Charlie's favorite tiktok account is?", a: "Shreya's league thirst trap tiktok", hint: "" },
          { q: "Who would most likely be killed, if Shreya was unhappy in her relationship?", a: "Shreya", hint: "" },
          { q: "What word does Shreya thinks is hilarious when she says it, but doesn't want Charlie to start copying?", a: "nigga", hint: "" },
          { q: "If you were to cheat on me with one person, who would it be?", a: "Julie", hint: "" },
        ],
      },
      {
        name: "Geography",
        tiles: [
          { q: "Where did we begin your birthday eating bagels in 2024?", a: "Campenelle", hint: "" },
          { q: "In what city did we have our first Dave's Hot Chicken?", a: "Milwaukee", hint: "" },
          { q: "Where was I waiting for you, nervously, to ask you out 'officially'?", a: "on the bench outside MLK building", hint: "" },
          { q: "In what city have we gone to a museum?", a: "St. Paul", hint: "" },
          { q: "In what town did Harry Potter grow up, and is also where his parents died?", a: "Godric's Hollow", hint: "Godric's stomach after ramadan" },
        ],
      },
      {
        name: "Charlie",
        tiles: [
          { q: "What could I not eat for 8 years?", a: "Cheese", hint: "" },
          { q: "What was the first game I was exceptional at (competitive)?", a: "Call of Duty 4: Modern Warfare", hint: "" },
          { q: "What age did I lose my front teeth?", a: "2", hint: "" },
          { q: "What was my favorite condiment growing up?", a: "Ketchup", hint: "" },
          { q: "What was the name of the suburb of Detroit Charlie was born in?", a: "Ferndale", hint: "" },
        ],
      },
    ],
  };

  /* ----------------------------
     State + Storage
  ----------------------------- */
  const stateKey = "xmas_jeopardy_v1_state";
  let score = 0;
  let used = new Set(); // "c{c}-r{r}"
  let active = null; // { key, c, r, value, q, a, hint, category }

  function saveState() {
    localStorage.setItem(stateKey, JSON.stringify({
      score,
      used: Array.from(used),
    }));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(stateKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      score = Number(data.score || 0);
      used = new Set(Array.isArray(data.used) ? data.used : []);
    } catch (_) {}
  }

  /* ----------------------------
     DOM
  ----------------------------- */
  const $ = (id) => document.getElementById(id);

  const categoriesEl = $("categories");
  const gridEl = $("grid");

  const scoreEl = $("score");
  const progressBar = $("progressBar");

  const unlockStatus = $("unlockStatus");
  const unlockHint = $("unlockHint");
  const openLetterBtn = $("openLetterBtn");
  const resetBtn = $("resetBtn");

  const modalOverlay = $("modalOverlay");
  const modalTitle = $("modalTitle");
  const modalClue = $("modalClue");
  const modalHint = $("modalHint");

  const answerBox = $("answerBox");
  const modalAnswer = $("modalAnswer");

  const closeModalBtn = $("closeModalBtn");
  const revealBtn = $("revealBtn");
  const skipBtn = $("skipBtn");
  const gotItBtn = $("gotItBtn");
  const valSpan = $("valSpan");

  const toast = $("toast");

  /* ----------------------------
     Helpers
  ----------------------------- */
  const money = (n) => `$${n.toLocaleString("en-US")}`;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = "block";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toast.style.display = "none"), 1700);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* ----------------------------
     Rendering
  ----------------------------- */
  function updateHeader() {
    if (scoreEl) scoreEl.textContent = money(score);

    const pct = clamp((score / GOAL) * 100, 0, 100);
    if (progressBar) progressBar.style.width = `${pct}%`;

    if (score >= GOAL) {
      if (unlockStatus) unlockStatus.textContent = "🔓 Letter unlocked!";
      if (unlockHint) unlockHint.textContent = "Okayyyy rich girl. Go open it.";
      if (openLetterBtn) {
        openLetterBtn.disabled = false;
        openLetterBtn.classList.remove("btnLocked");
      }
    } else {
      if (unlockStatus) unlockStatus.textContent = "🔒 Letter locked";
      if (unlockHint) unlockHint.textContent = `Earn ${money(GOAL - score)} more to unlock it.`;
      if (openLetterBtn) {
        openLetterBtn.disabled = true;
        openLetterBtn.classList.add("btnLocked");
      }
    }
  }

  function renderBoard() {
    if (!categoriesEl || !gridEl) return;

    categoriesEl.innerHTML = "";
    gridEl.innerHTML = "";

    // Category headers
    BOARD.categories.forEach((cat) => {
      const div = document.createElement("div");
      div.className = "cat";
      div.title = cat.name;
      div.textContent = cat.name;
      categoriesEl.appendChild(div);
    });

    // 5 rows of values x 5 cols of categories
    for (let r = 0; r < VALUES.length; r++) {
      for (let c = 0; c < BOARD.categories.length; c++) {
        const key = `c${c}-r${r}`;
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.textContent = money(VALUES[r]);

        if (used.has(key)) {
          cell.classList.add("used");
          cell.textContent = "✓";
        } else {
          cell.addEventListener("click", () => openClue(c, r, key));
        }

        gridEl.appendChild(cell);
      }
    }

    updateHeader();
  }

  /* ----------------------------
     Modal
  ----------------------------- */
  function openClue(c, r, key) {
    if (used.has(key)) return;

    const category = BOARD.categories[c];
    const tile = category.tiles[r] || { q: "[PLACEHOLDER: missing tile]", a: "[PLACEHOLDER]", hint: "" };
    const value = VALUES[r];

    active = {
      key, c, r, value,
      category: category.name,
      q: tile.q ?? "[PLACEHOLDER question]",
      a: tile.a ?? "[PLACEHOLDER answer]",
      hint: tile.hint ?? ""
    };

    if (modalTitle) modalTitle.textContent = `${active.category} — ${money(value)}`;
    if (modalClue) modalClue.textContent = active.q;

    const hintText = active.hint?.trim()
      ? active.hint.trim()
      : "Say your answer out loud first. Then reveal the answer (optional) and score yourself.";
    if (modalHint) modalHint.textContent = hintText;

    if (valSpan) valSpan.textContent = value.toLocaleString("en-US");

    // Reset answer reveal state
    if (answerBox) answerBox.hidden = true;
    if (modalAnswer) modalAnswer.textContent = active.a;

    if (modalOverlay) {
      modalOverlay.style.display = "flex";
      modalOverlay.setAttribute("aria-hidden", "false");
    }
  }

  function closeModal() {
    active = null;
    if (modalOverlay) {
      modalOverlay.style.display = "none";
      modalOverlay.setAttribute("aria-hidden", "true");
    }
  }

  function markUsed(key) {
    used.add(key);
    saveState();
    renderBoard();
  }

  /* ----------------------------
     Confetti (simple)
  ----------------------------- */
  function confettiBurst() {
    // lightweight: create a few emoji bursts
    const count = 18;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.textContent = Math.random() < 0.5 ? "✨" : "🎉";
      el.style.position = "fixed";
      el.style.left = `${50 + (Math.random() * 40 - 20)}%`;
      el.style.top = "15%";
      el.style.zIndex = "80";
      el.style.fontSize = `${18 + Math.random() * 14}px`;
      el.style.opacity = "1";
      el.style.transform = `translate(-50%, -50%)`;
      el.style.pointerEvents = "none";

      const driftX = (Math.random() * 240 - 120);
      const driftY = (Math.random() * 340 + 220);

      document.body.appendChild(el);

      const start = performance.now();
      const dur = 1100 + Math.random() * 600;

      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        el.style.transform = `translate(${driftX * p - 0}px, ${driftY * p}px) rotate(${p * 220}deg)`;
        el.style.opacity = String(1 - p);
        if (p < 1) requestAnimationFrame(tick);
        else el.remove();
      };
      requestAnimationFrame(tick);
    }
  }

  /* ----------------------------
     Snow generator
  ----------------------------- */
  function initSnow() {
    const snow = document.getElementById("snow");
    if (!snow) return;

    snow.innerHTML = "";
    const count = 70;

    for (let i = 0; i < count; i++) {
      const f = document.createElement("div");
      f.className = "flake";
      const left = Math.random() * 100;
      const size = 3 + Math.random() * 5;
      const dur = 6 + Math.random() * 10;
      const delay = Math.random() * -dur;

      f.style.left = left + "vw";
      f.style.width = size + "px";
      f.style.height = size + "px";
      f.style.animationDuration = dur + "s";
      f.style.animationDelay = delay + "s";
      f.style.opacity = (0.35 + Math.random() * 0.6).toFixed(2);

      snow.appendChild(f);
    }
  }

  /* ----------------------------
     Event wiring (only if elements exist on page)
  ----------------------------- */
  function wireEvents() {
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

    if (modalOverlay) {
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    if (revealBtn) {
      revealBtn.addEventListener("click", () => {
        if (!active) return;
        if (answerBox) answerBox.hidden = false;
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener("click", () => {
        if (!active) return;
        markUsed(active.key);
        closeModal();
        showToast("Skipped ✅");
      });
    }

    if (gotItBtn) {
      gotItBtn.addEventListener("click", () => {
        if (!active) return;
        const before = score;
        score += active.value;
        markUsed(active.key);
        closeModal();

        showToast(`+${money(active.value)} 😌`);

        // Unlock moment
        if (before < GOAL && score >= GOAL) {
          confettiBurst();
          showToast("🎉 You unlocked the letter!");
        }
      });
    }

    if (resetBtn) {
    resetBtn.addEventListener("click", (e) => {
        e.preventDefault();

        // If confirm dialogs are annoying / blocked, you can remove this if statement.
        const ok = confirm("Reset the whole game? This clears your score and board.");
        if (!ok) return;

        score = 0;
        used = new Set();

        // hard-clear and re-save
        localStorage.removeItem(stateKey);
        saveState();

        renderBoard();
        showToast("Reset ✅");
    });
    }

    if (openLetterBtn) {
      openLetterBtn.addEventListener("click", () => {
        if (score < GOAL) return;
        window.location.href = "./letter.html";
      });
    }
  }

  /* ----------------------------
     Init
  ----------------------------- */
  function init() {
    initSnow();
    loadState();
    renderBoard();
    wireEvents();

    // If someone loads letter.html directly, we still want snow
    // and we don't need the board.
  }

  document.addEventListener("DOMContentLoaded", init);
})();
