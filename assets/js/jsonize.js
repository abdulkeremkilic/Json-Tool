// Elements
const searchBtn = document.getElementById("searchBtn");
const scriptBtn = document.getElementById("scriptBtn");
const runScript = document.getElementById("runScript");
const cancelSearch = document.getElementById("cancelSearch");
const cancelScript = document.getElementById("cancelScript");
const jsonInput = document.getElementById("jsonInput");
const output = document.getElementById("output");
const renderBtn = document.getElementById("renderBtn");
const reverseBtn = document.getElementById("reverseBtn");
const resizeHandle = document.getElementById("resizeHandle");
const mainArea = document.getElementById("mainArea");
const themeToggle = document.getElementById("themeToggle");
const navbarBrand = document.getElementById("navbarBrand");
const examplesBtn = document.getElementById("examplesBtn");
const scriptExamplePopup = document.getElementById("scriptExamplePopup");
const searchInline = document.getElementById("searchInline");
const scriptInline = document.getElementById("scriptInline");

let matches = [];
let currentIndex = -1;
let lastSearchTerm = "";
let currentJsonData = null;
let isDragging = false;

// Theme toggle functionality
const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Navbar brand click functionality
navbarBrand.addEventListener("click", () => {
  window.location.reload();
});

// Toggle göster/gizle
searchBtn.addEventListener("click", () => {
  searchInline.style.display =
    searchInline.style.display === "none" ? "block" : "none";
  scriptInline.style.display = "none";
  searchInline.focus();
});

scriptBtn.addEventListener("click", () => {
  scriptInline.style.display =
    scriptInline.style.display === "none" ? "block" : "none";
  searchInline.style.display = "none";
  scriptInline.focus();
});



scriptInline.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    applyScript(scriptInline.value);
  }
});

examplesBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // olayın dışarıya sıçramasını engelle
  scriptExamplePopup.style.display =
    scriptExamplePopup.style.display === "block" ? "none" : "block";
});

document.querySelectorAll("#scriptExamplePopup li").forEach((li) => {
  li.addEventListener("click", (e) => {
    e.stopPropagation(); // dış click gibi algılanmasın
    const script = li.getAttribute("data-script");
    scriptInline.value = script;
    scriptInline.style.display = "block";
    searchInline.style.display = "none";
    scriptExamplePopup.style.display = "none";
  });
});

document.addEventListener("click", (e) => {
  const popups = [
    document.getElementById("searchPopup"),
    document.getElementById("scriptPopup"),
    document.getElementById("scriptExamplePopup"),
  ];
  const triggers = [
    document.getElementById("searchBtn"),
    document.getElementById("scriptBtn"),
    document.getElementById("examplesBtn"),
  ];

  popups.forEach((popup, i) => {
    if (popup && !popup.contains(e.target) && !triggers[i].contains(e.target)) {
      popup.style.display = "none";

      const input = popup.querySelector("input");
      if (input) input.value = "";
    }
  });
});

// Resize functionality
let currentPosition = 50; // Start at 50% (equal split)
let startX = 0;
let startPosition = 0;

resizeHandle.addEventListener("mousedown", (e) => {
  isDragging = true;
  startX = e.clientX;
  startPosition = currentPosition;
  resizeHandle.classList.add("dragging");
  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", stopDrag);
  e.preventDefault();
});

function handleDrag(e) {
  if (!isDragging) return;

  const deltaX = e.clientX - startX;
  const containerWidth = mainArea.offsetWidth;
  const deltaPercent = (deltaX / containerWidth) * 100;

  let newPosition = startPosition + deltaPercent;

  // Set limits: minimum 20%, maximum 80%
  newPosition = Math.max(20, Math.min(80, newPosition));

  currentPosition = newPosition;
  updatePanelSizes();
}

function updatePanelSizes() {
  const leftPercent = currentPosition;
  const rightPercent = 100 - currentPosition;

  mainArea.style.gridTemplateColumns = `${leftPercent}% auto ${rightPercent}%`;
}

function stopDrag() {
  isDragging = false;
  resizeHandle.classList.remove("dragging");
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);
}

// Initialize the slider position
updatePanelSizes();

function togglePopup(popup, button) {
  // Close other popups
  document.querySelectorAll(".input-popup").forEach((p) => {
    if (p !== popup) {
      p.classList.remove("active");
    }
  });
  document.querySelectorAll(".panel-btn").forEach((b) => {
    if (b !== button) {
      b.classList.remove("active");
    }
  });

  // Toggle current popup
  popup.classList.toggle("active");
  button.classList.toggle("active");

  if (popup.classList.contains("active")) {
    popup.querySelector("input").focus();
  }
}

function closePopup(popup, button) {
  popup.classList.remove("active");
  button.classList.remove("active");
}

// Enter ile çalıştır
searchInline.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSearch(searchInline.value);
  }
});

function handleSearch(term) {
  clearHighlights();
  matches = [];
  currentIndex = -1;
  if (!term) return;

  lastSearchTerm = term;

  // Pathleri bul
  const foundPaths = findPathsContainingTerm(currentJsonData, term);

  // Pathleri aç ve highlight callback olarak çağır
  expandPathsLazy(foundPaths, () => {
    highlightMatches(term);

    if (matches.length > 0) {
      currentIndex = 0;
      updateActiveMatch();
    }
  });
}

// JSON’da path bulma
// Key + Value arama
function findPathsContainingTerm(obj, term, path = "") {
  let paths = [];
  const lowerTerm = term.toLowerCase();

  if (typeof obj === "object" && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Key eşleşmesi
      if (key.toLowerCase().includes(lowerTerm)) {
        paths.push(currentPath);
      }

      // Value eşleşmesi
      if (
        typeof value !== "object" &&
        String(value).toLowerCase().includes(lowerTerm)
      ) {
        paths.push(currentPath);
      }

      // Alt objeleri gez
      if (typeof value === "object" && value !== null) {
        paths = paths.concat(findPathsContainingTerm(value, term, currentPath));
      }
    }
  }

  return paths;
}

// Lazy expand + callback
function expandPathsLazy(paths, callback) {
  let totalPaths = paths.length;
  let completed = 0;

  if (totalPaths === 0) {
    callback();
    return;
  }

  // Root detayını aç ve render bitmesini bekle
  const rootDetails = output.querySelector("details");
  if (rootDetails && !rootDetails.open) {
    rootDetails.open = true;

    const rootContainer = rootDetails.querySelector("div");
    waitForChildren(rootContainer, () => {
      // Root render bitince path zincirine başla
      paths.forEach(path => {
        const segments = path.split(".");
        expandSegmentChain(rootContainer, segments, 0, () => {
          completed++;
          if (completed === totalPaths) {
            callback();
          }
        });
      });
    });
  } else {
    // Root zaten açıksa direkt başla
    const rootContainer = rootDetails ? rootDetails.querySelector("div") : output;
    paths.forEach(path => {
      const segments = path.split(".");
      expandSegmentChain(rootContainer, segments, 0, () => {
        completed++;
        if (completed === totalPaths) {
          callback();
        }
      });
    });
  }
}

// Segmentleri zincirleme aç
function expandSegmentChain(container, segments, index, done) {
  if (index >= segments.length) {
    done();
    return;
  }

  const seg = segments[index];
  const summaries = container.querySelectorAll("summary");
  let matchSummary = null;

  summaries.forEach(summary => {
    const keySpan = summary.querySelector(".key");
    if (keySpan && keySpan.textContent.replace(/:$/, "") === seg) {
      matchSummary = summary;
    }
  });

  if (!matchSummary) {
    done(); // bulunamadıysa çık
    return;
  }

  const detail = matchSummary.parentElement;
  if (!detail.open) detail.open = true;

  const childContainer = detail.querySelector("div");

  if (childContainer) {
    // Eğer alt children daha render edilmediyse bekle ve sonra devam et
    waitForChildren(childContainer, () => {
      expandSegmentChain(childContainer, segments, index + 1, done);
    });
  } else {
    done();
  }
}

// Çocukların yüklenmesini bekleme
function waitForChildren(container, done) {
  const check = () => {
    if (container.childNodes.length > 0) {
      done();
    } else {
      setTimeout(check, 30);
    }
  };
  check();
}

// Highlight fonksiyonu aynı kalabilir
function highlightMatches(term) {
  const walk = (node) => {
    if (node.nodeType === 3) {
      const idx = node.nodeValue.toLowerCase().indexOf(term.toLowerCase());
      if (idx !== -1) {
        const span = document.createElement("span");
        span.className = "highlight";
        const match = node.splitText(idx);
        const after = match.splitText(term.length);
        const cloned = match.cloneNode(true);
        span.appendChild(cloned);
        match.parentNode.replaceChild(span, match);
        matches.push(span);
      }
    } else if (node.nodeType === 1 && node.childNodes) {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  walk(output);
}

// Render functionality
renderBtn.addEventListener("click", renderJson);
reverseBtn.addEventListener("click", reverseToJson);

function renderJson() {
  const input = jsonInput.value.trim();
  if (!input) {
    output.innerHTML = "";
    currentJsonData = null;
    return;
  }

  try {
    const json = JSON.parse(input);
    currentJsonData = json;
    output.innerHTML = "";
    output.appendChild(renderTree(json));
  } catch (err) {
    output.innerHTML = `<div class="error">Invalid JSON: ${err.message}</div>`;
    currentJsonData = null;
  }
}

function reverseToJson() {
  if (!currentJsonData) {
    jsonInput.value = "";
    return;
  }

  try {
    const beautifiedJson = JSON.stringify(currentJsonData, null, 2);
    jsonInput.value = beautifiedJson;
  } catch (err) {
    console.error("Error reversing JSON:", err);
  }
}

function renderTree(data, key = "") {
  if (typeof data === "object" && data !== null) {
    const isArray = Array.isArray(data);
    const details = document.createElement("details");

    const summary = document.createElement("summary");
    const count = isArray ? data.length : Object.keys(data).length;
    summary.innerHTML = `<span class="key">${
      key || (isArray ? `Array[${count}]` : `Object{${count}}`)
    }</span>`;
    details.appendChild(summary);

    // Lazy yükleme: boş container ve flag
    const container = document.createElement("div");
    container.style.marginLeft = "16px";
    details.appendChild(container);

    let isLoaded = false;

    details.addEventListener("toggle", () => {
      if (details.open && !isLoaded) {
        isLoaded = true;
        renderChildrenChunked(data, container);
      }
    });

    return details;
  } else {
    const line = document.createElement("div");
    line.style.margin = "2px 0";

    const keySpan = document.createElement("span");
    keySpan.className = "key";
    keySpan.textContent = key ? `${key}: ` : "";

    const valueSpan = document.createElement("span");
    valueSpan.className = getTypeClass(data);
    valueSpan.textContent = formatValue(data);

    line.appendChild(keySpan);
    line.appendChild(valueSpan);
    return line;
  }
}

function renderChildrenChunked(data, container) {
  const entries = Object.entries(data);
  let i = 0;
  const CHUNK_SIZE = 20; // performans için ayarlanabilir

  function renderChunk() {
    const fragment = document.createDocumentFragment();

    for (
      let count = 0;
      count < CHUNK_SIZE && i < entries.length;
      count++, i++
    ) {
      const [k, v] = entries[i];
      fragment.appendChild(renderTree(v, k));
    }

    container.appendChild(fragment);

    if (i < entries.length) {
      requestAnimationFrame(renderChunk);
    }
  }

  requestAnimationFrame(renderChunk);
}

function formatValue(val) {
  if (typeof val === "string") return `"${val}"`;
  if (val === null) return "null";
  return String(val);
}

function getTypeClass(val) {
  if (typeof val === "string") return "value-string";
  if (typeof val === "number") return "value-number";
  if (typeof val === "boolean") return "value-boolean";
  if (val === null) return "value-null";
  return "";
}

function doSearchAction(term) {
  clearHighlights();
  matches = [];
  currentIndex = -1;

  const searchTerm = term.trim();
  if (!searchTerm) return;

  lastSearchTerm = searchTerm;
  highlightMatches(searchTerm);

  if (matches.length > 0) {
    currentIndex = 0;
    updateActiveMatch();
  }
}

function clearHighlights() {
  matches.forEach((span) => {
    span.outerHTML = span.innerText;
  });
  matches = [];
  currentIndex = -1;
}

function highlightMatches(term) {
  const walk = (node) => {
    if (node.nodeType === 3) {
      const idx = node.nodeValue.toLowerCase().indexOf(term.toLowerCase());
      if (idx !== -1) {
        const span = document.createElement("span");
        span.className = "highlight";
        const match = node.splitText(idx);
        const after = match.splitText(term.length);
        const cloned = match.cloneNode(true);
        span.appendChild(cloned);
        match.parentNode.replaceChild(span, match);
        matches.push(span);
      }
    } else if (node.nodeType === 1 && node.childNodes) {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  walk(output);
}

function updateActiveMatch() {
  matches.forEach((span, i) => {
    span.classList.toggle("active", i === currentIndex);
  });
  if (currentIndex >= 0) {
    matches[currentIndex].scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

function goNext() {
  if (matches.length === 0) return;
  currentIndex = (currentIndex + 1) % matches.length;
  updateActiveMatch();
}

function applyScript() {
  const raw = jsonInput.value.trim();
  const script = scriptInline.value.trim();

  if (!raw || !script) return;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    output.innerHTML = `<div class="error">Invalid JSON: ${e.message}</div>`;
    currentJsonData = null;
    return;
  }

  try {
    const scriptResult = eval(
      `(() => { const data = ${JSON.stringify(parsed)}; return ${script}; })()`
    );
    currentJsonData = scriptResult;
    output.innerHTML = "";
    output.appendChild(renderTree(scriptResult));
  } catch (e) {
    output.innerHTML = `<div class="error">Script error: ${e.message}</div>`;
    currentJsonData = null;
  }
}
