const DAY_MS = 86400000;

(async () => {
  const params = new URLSearchParams(window.location.search);
  const kwParam = params.get("kw");

  const [s, l] = await Promise.all([
    chrome.storage.sync.get(["customMessage", "streakStart"]),
    chrome.storage.local.get(["blockCount", "weekStart"]),
  ]);

  // Weekly counter
  const now = Date.now();
  const weekMs = 7 * DAY_MS;
  let weekStart = l.weekStart || now;
  let count = l.blockCount || 0;
  if (now - weekStart > weekMs) { weekStart = now; count = 0; }
  count++;
  await chrome.storage.local.set({ blockCount: count, weekStart });
  document.getElementById("count").textContent = count;

  // Streak
  const streakDays = s.streakStart ? Math.floor((now - s.streakStart) / DAY_MS) : 0;
  document.getElementById("streak").textContent = streakDays;

  // Message — keyword blocks get a specific message
  if (kwParam) {
    document.getElementById("msg").textContent =
      `Blocked — this page contains the keyword "${decodeURIComponent(kwParam)}".`;
  } else if (s.customMessage) {
    document.getElementById("msg").textContent = s.customMessage;
  }

  document.getElementById("back").addEventListener("click", () => history.back());
  document.getElementById("study").addEventListener("click", () => {
    location.href = "https://www.google.com";
  });
})();
