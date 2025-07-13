const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const jsonInput = document.getElementById("jsonInput");
const output = document.getElementById("output");
const scriptInput = document.getElementById("scriptInput");
const runScript = document.getElementById("runScript");
const renderBtn = document.getElementById("renderBtn");
const reverseBtn = document.getElementById("reverseBtn");

let matches = [];
let currentIndex = -1;
let lastSearchTerm = "";
let currentJsonData = null; // Store the current JSON data

// Event listeners
searchBtn.addEventListener("click", handleSearch);
runScript.addEventListener("click", applyScript);
renderBtn.addEventListener("click", renderJson);
reverseBtn.addEventListener("click", reverseToJson);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSearch();
  }
});

scriptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    applyScript();
  }
});

function handleSearch() {
  const currentTerm = searchInput.value.trim();

  if (currentTerm === "") return;

  if (currentTerm !== lastSearchTerm) {
    doSearch();
  } else if (matches.length > 0) {
    goNext();
  } else {
    doSearch();
  }
}

function renderJson() {
  const input = jsonInput.value.trim();

  if (!input) {
    output.innerHTML = "";
    currentJsonData = null;
    return;
  }

  try {
    const json = JSON.parse(input);
    currentJsonData = json; // Store the parsed data
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
    // Convert the current JSON data back to beautified string
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
    details.open = true;

    const summary = document.createElement("summary");
    const count = isArray ? data.length : Object.keys(data).length;
    summary.innerHTML = `<span class="key">${
      key || (isArray ? `Array[${count}]` : `Object{${count}}`)
    } </span>`;
    details.appendChild(summary);

    const container = document.createElement("div");
    container.style.marginLeft = "16px";

    Object.entries(data).forEach(([k, v]) => {
      const child = renderTree(v, k);
      container.appendChild(child);
    });

    details.appendChild(container);
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

function doSearch() {
  clearHighlights();
  matches = [];
  currentIndex = -1;

  const searchTerm = searchInput.value.trim();
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
  const script = scriptInput.value.trim();

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
    currentJsonData = scriptResult; // Store the script result
    output.innerHTML = "";
    output.appendChild(renderTree(scriptResult));
  } catch (e) {
    output.innerHTML = `<div class="error">Script error: ${e.message}</div>`;
    currentJsonData = null;
  }
}