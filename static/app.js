const inputText = document.getElementById("input-text");
const wordCount = document.getElementById("word-count");
const charCount = document.getElementById("char-count");
const suggCount = document.getElementById("sugg-count");
const copyBtn = document.getElementById("copy-btn");
const deleteBtn = document.getElementById("delete-btn");
const checkBtn = document.getElementById("check-btn");
// If the button doesn't exist (real-time mode), avoid crashing.
const hasCheckButton = !!checkBtn;

const toastMessage = document.getElementById("toast-message");
const suggestionsList = document.getElementById("suggestions-list");
const emptyState = document.getElementById("empty-state");

let toastTimer = null;
let liveCheckTimer = null; // kept for backwards compatibility (no longer used)

let activeCheckId = 0;
let lastCheckedText = "";

function showToast(message) {
  toastMessage.textContent = message;
  toastMessage.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.classList.remove("show");
  }, 1800);
}

// Keep word counting consistent with backend tokenizer: WORD_RE in project.py
// Back-end: [A-Za-z0-9']+(?:-[A-Za-z0-9']+)*
function countWords(text) {
  const re = /[A-Za-z0-9']+(?:-[A-Za-z0-9']+)*/g;
  const matches = text.match(re);
  return matches ? matches.length : 0;
}


function findAllOccurrences(haystack, needle) {
  const results = [];
  if (!needle) return results;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "gi");
  let match;
  while ((match = re.exec(haystack)) !== null) {
    results.push({ start: match.index, end: match.index + match[0].length });

    // Avoid infinite loops for zero-length matches
    if (match.index === re.lastIndex) re.lastIndex++;
  }
  return results;
}

function renderSuggestions(errors) {
  const suggestionsListEl = document.getElementById("suggestions-list");
  if (!suggestionsListEl) return;

  suggestionsListEl.innerHTML = "";

  if (!errors.length) {
    suggestionsList.style.display = "none";
    emptyState.style.display = "block";
    suggCount.textContent = "0";
    return;
  }

  suggestionsList.style.display = "block";
  emptyState.style.display = "none";
  suggCount.textContent = String(errors.length);

  errors.forEach((error) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";

    const token = error.token ?? "";
    const suggestions = Array.isArray(error.suggestions) ? error.suggestions : [];
    const detail = suggestions.length
      ? `Suggestions: ${suggestions.join(", ")}`
      : "No suggestion";

    item.innerHTML = `
      <strong>${token}</strong>
      <div class="suggestion-detail">${detail}</div>
    `;

    suggestionsListEl.appendChild(item);
  });
}


function updateCounters() {
  const text = inputText.value;
  const words = countWords(text);

  if (words > 500) {
    inputText.value = inputText.value.trim().split(/\s+/).slice(0, 500).join(" ");
  }

  const cappedWords = Math.min(words, 500);
  wordCount.textContent = cappedWords;
  charCount.textContent = inputText.value.length;
}

async function checkText(options = {}) {
  const { source = "manual", silent = false } = options;
  const text = inputText.value.trim();
  if (!text) {
    if (!silent) {
      showToast("Please type some text first.");
    }
    renderSuggestions([]);
    lastCheckedText = "";
    return;
  }

  if (source === "live" && text === lastCheckedText) {
    return;
  }

  const checkId = ++activeCheckId;
  if (source === "manual") {
    checkBtn.disabled = true;
    checkBtn.textContent = "Checking...";
  }

  try {
    const response = await fetch("/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const data = await response.json();
    if (checkId !== activeCheckId) {
      return;
    }

    renderSuggestions(data.errors || []);
    suggCount.textContent = String(data.error_count || 0);
    lastCheckedText = text;



    if (!silent && source === "manual") {
      showToast(data.error_count ? "Errors detected." : "No errors detected.");
    }
  } catch (error) {
    if (checkId !== activeCheckId) {
      return;
    }
    if (!silent && source === "manual") {
      showToast("Backend check failed.");
    }
  } finally {
    if (checkId === activeCheckId && source === "manual") {
      checkBtn.disabled = false;
      checkBtn.textContent = "Check Text";
    }
  }
}

deleteBtn.addEventListener("click", function () {
  inputText.value = "";
  wordCount.textContent = "0";
  charCount.textContent = "0";
  suggCount.textContent = "0";
  suggestionsList.innerHTML = "";
  suggestionsList.style.display = "none";
  emptyState.style.display = "block";
  inputText.focus();
  showToast("Text cleared.");
});

copyBtn.addEventListener("click", async function () {
  const text = inputText.value.trim();
  if (!text) {
    showToast("Nothing to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(inputText.value);
    showToast("Text copied successfully.");
  } catch (error) {
    showToast("Copy failed.");
  }
});

if (hasCheckButton) {
  checkBtn.addEventListener("click", checkText);
}


suggestionsList.style.display = "none";
emptyState.style.display = "block";
updateCounters();

// Live update counters while typing (fix “character/word count not working”).
inputText.addEventListener("input", () => {
  updateCounters();
});

