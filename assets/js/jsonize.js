// Elements
const jsonInput = document.getElementById("jsonInput");
const output = document.getElementById("output");
const processBtn = document.getElementById("processBtn");
const formatBtn = document.getElementById("formatBtn");
const minifyBtn = document.getElementById("minifyBtn");
const clearBtn = document.getElementById("clearBtn");
const searchBtn = document.getElementById("searchBtn");
const searchInline = document.getElementById("searchInline");
const expandBtn = document.getElementById("expandBtn");
const collapseBtn = document.getElementById("collapseBtn");
const themeToggle = document.getElementById("themeToggle");
const navbarBrand = document.getElementById("navbarBrand");

// Refresh on Logo Click
navbarBrand.addEventListener("click", () => {
  window.location.reload();
});

// State
let currentJsonData = null;
let flaggedPaths = new Set(); // Store generic paths like "users[*].name"
let lastSearchTerm = "";
let currentMatchIndex = -1;

// Theme Toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
});

// Process JSON (Render Tree)
processBtn.addEventListener("click", () => {
  const input = jsonInput.value.trim();
  if (!input) return;

  try {
    currentJsonData = JSON.parse(input);
    renderTreeMain();
  } catch (err) {
    output.innerHTML = `<div style="color: var(--value-boolean); padding: 10px;">Invalid JSON: ${err.message}</div>`;
  }
});

// Format JSON
formatBtn.addEventListener("click", () => {
  const input = jsonInput.value.trim();
  if (!input) return;
  try {
    const json = JSON.parse(input);
    jsonInput.value = JSON.stringify(json, null, 2);
  } catch (err) {
    alert("Invalid JSON");
  }
});

// Minify JSON
minifyBtn.addEventListener("click", () => {
  const input = jsonInput.value.trim();
  if (!input) return;
  try {
    const json = JSON.parse(input);
    jsonInput.value = JSON.stringify(json);
  } catch (err) {
    alert("Invalid JSON");
  }
});

// Clear
clearBtn.addEventListener("click", () => {
  jsonInput.value = "";
  output.innerHTML = "";
  currentJsonData = null;
  flaggedPaths.clear();
});

// Expand/Collapse All
expandBtn.addEventListener("click", () => {
  output.querySelectorAll("details").forEach((el) => (el.open = true));
});

collapseBtn.addEventListener("click", () => {
  output.querySelectorAll("details").forEach((el) => (el.open = false));
});

// Search
searchBtn.addEventListener("click", () => {
  handleSearch(searchInline.value);
});

searchInline.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch(searchInline.value);
});

function handleSearch(term) {
  if (!term) return;

  const lowerTerm = term.toLowerCase();

  // Check if it's a new search or navigation
  const hasHighlights = document.querySelectorAll('.search-highlight').length > 0;

  if (term !== lastSearchTerm || !hasHighlights) {
    // New Search
    lastSearchTerm = term;
    currentMatchIndex = -1;

    // 1. Clear previous highlights
    document.querySelectorAll('.search-highlight').forEach(span => {
      const parent = span.parentNode;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    });

    // 2. Find and highlight matches
    const walker = document.createTreeWalker(output, NodeFilter.SHOW_TEXT);
    let node;
    const nodesToHighlight = [];

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent.classList.contains("key") || parent.className.startsWith("value-")) {
        if (node.nodeValue.toLowerCase().includes(lowerTerm)) {
          nodesToHighlight.push(node);
        }
      }
    }

    nodesToHighlight.forEach(node => {
      const parent = node.parentElement;
      const text = node.nodeValue;
      const lowerText = text.toLowerCase();

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let index = lowerText.indexOf(lowerTerm);

      while (index !== -1) {
        if (index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
        }

        const span = document.createElement('span');
        span.className = 'search-highlight';
        span.textContent = text.substring(index, index + term.length);
        fragment.appendChild(span);

        lastIndex = index + term.length;
        index = lowerText.indexOf(lowerTerm, lastIndex);
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      parent.replaceChild(fragment, node);

      // Expand parents
      let curr = parent;
      while (curr && curr !== output) {
        if (curr.tagName === "DETAILS") curr.open = true;
        curr = curr.parentElement;
      }
    });
  }

  // Navigation Logic
  const allHighlights = document.querySelectorAll('.search-highlight');
  if (allHighlights.length === 0) return;

  // Increment index
  currentMatchIndex++;
  if (currentMatchIndex >= allHighlights.length) {
    currentMatchIndex = 0; // Wrap around
  }

  // Update active class
  allHighlights.forEach(el => el.classList.remove('active'));
  const activeEl = allHighlights[currentMatchIndex];
  activeEl.classList.add('active');

  // Scroll into view
  activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ==========================================
// TREE RENDERING & FLAG LOGIC
// ==========================================

function renderTreeMain() {
  output.innerHTML = "";
  if (!currentJsonData) return;

  // Reset search state
  lastSearchTerm = "";
  currentMatchIndex = -1;

  const tree = createTreeElement(currentJsonData, "root", "");
  output.appendChild(tree);

  // Re-apply flags after render
  applyFlags();
}

function createTreeElement(data, key, path) {
  if (typeof data === "object" && data !== null) {
    const isArray = Array.isArray(data);
    const details = document.createElement("details");
    details.setAttribute("data-path", path); // Store path for reference

    const summary = document.createElement("summary");
    const count = isArray ? data.length : Object.keys(data).length;
    summary.innerHTML = `<span class="key">${key}</span> <span style="color:var(--text-color); opacity:0.6">${isArray ? `[${count}]` : `{${count}}`}</span>`;
    details.appendChild(summary);

    const container = document.createElement("div");
    container.style.paddingLeft = "10px";

    const flaggedSection = document.createElement("div");
    flaggedSection.className = "flagged-section";
    flaggedSection.style.display = "none";
    container.appendChild(flaggedSection);

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "children-section";
    container.appendChild(childrenContainer);

    Object.entries(data).forEach(([k, v], index) => {
      const currentPath = path ? `${path}.${k}` : k;
      const child = createTreeElement(v, k, currentPath);
      child.setAttribute("data-original-index", index); // Store index
      childrenContainer.appendChild(child);
    });

    details.appendChild(container);

    // Add flag to summary for the object itself (if it has a parent key)
    if (key !== "root") {
      const flag = document.createElement("i");
      flag.className = "fas fa-flag flag-icon";
      flag.style.marginLeft = "8px";
      flag.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent details toggle
        toggleFlag(path);
      };
      summary.insertBefore(flag, summary.firstChild);
    }

    return details;
  } else {
    const field = document.createElement("div");
    field.className = "json-field";
    field.setAttribute("data-path", path);
    field.setAttribute("data-key", key);

    // Flag Icon
    const flag = document.createElement("i");
    flag.className = "fas fa-flag flag-icon";
    flag.onclick = (e) => {
      e.stopPropagation();
      toggleFlag(path);
    };
    field.appendChild(flag);

    // Content
    const content = document.createElement("div");
    content.innerHTML = `<span class="key">${key}:</span> <span class="${getTypeClass(data)}">${formatValue(data)}</span>`;
    field.appendChild(content);

    return field;
  }
}

function getTypeClass(val) {
  if (typeof val === "string") return "value-string";
  if (typeof val === "number") return "value-number";
  if (typeof val === "boolean") return "value-boolean";
  return "value-null";
}

function formatValue(val) {
  if (typeof val === "string") return `"${val}"`;
  return String(val);
}

// ==========================================
// ADVANCED FLAG LOGIC
// ==========================================

function toggleFlag(specificPath) {
  // specificPath example: "users.0.name" or "meta.version"

  // 1. Generalize the path to handle lists
  // We need to detect if any segment is an array index (integer)
  // and replace it with a wildcard or handle it logically.

  // Heuristic: Check if the path contains array indices.
  // Since we don't strictly know schema from path string alone, 
  // we can look at the structure. 
  // BUT, for this specific requirement: "If a list, apply to all".

  // Let's find the generic path.
  // We can walk up the DOM to find if parents are arrays?
  // Or just use regex to replace digits? 
  // "users.0.name" -> "users.*.name"

  const genericPath = generalizePath(specificPath);

  if (flaggedPaths.has(genericPath)) {
    flaggedPaths.delete(genericPath);
  } else {
    flaggedPaths.add(genericPath);
  }

  applyFlags();
}

function generalizePath(path) {
  // Replace numeric segments with '*'
  // e.g. "users.0.address.street" -> "users.*.address.street"
  return path.split('.').map(seg => isNaN(seg) ? seg : '*').join('.');
}

function applyFlags() {
  // 1. Reset all fields/objects to original position (children-section)
  // We need to target both .json-field AND details elements that might be flagged
  const allPotentialFlags = document.querySelectorAll('.json-field, details');

  allPotentialFlags.forEach(el => {
    const flagIcon = el.querySelector('.flag-icon');
    if (!flagIcon) return;

    // Remove visual flag state
    flagIcon.classList.remove('flagged');

    // Move back to children-section if currently in flagged-section
    const parentContainer = el.closest('div[style*="padding-left"]');
    if (!parentContainer) return;

    const childrenSection = parentContainer.querySelector('.children-section');
    const flaggedSection = parentContainer.querySelector('.flagged-section');

    if (el.parentElement === flaggedSection) {
      childrenSection.appendChild(el);
    }
  });

  // 2. Sort all children-sections by original index
  document.querySelectorAll('.children-section').forEach(section => {
    const children = Array.from(section.children);
    children.sort((a, b) => {
      const idxA = parseInt(a.getAttribute('data-original-index') || '0');
      const idxB = parseInt(b.getAttribute('data-original-index') || '0');
      return idxA - idxB;
    });
    children.forEach(child => section.appendChild(child));
  });

  // 3. Hide all flagged sections
  document.querySelectorAll('.flagged-section').forEach(el => {
    el.style.display = 'none';
  });

  // 4. Apply flags based on generic paths
  // Iterate flaggedPaths (Set preserves insertion order) to ensure correct visual order
  flaggedPaths.forEach(genericPath => {
    const regexStr = '^' + genericPath.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$';
    const regex = new RegExp(regexStr);

    // Find all matching elements (fields OR details)
    const allElements = document.querySelectorAll('.json-field, details');

    allElements.forEach(el => {
      const path = el.getAttribute('data-path');
      if (path && regex.test(path)) {
        const flagIcon = el.querySelector('.flag-icon');
        if (flagIcon) {
          flagIcon.classList.add('flagged');

          const parentContainer = el.closest('div[style*="padding-left"]');
          if (parentContainer) {
            const flaggedSection = parentContainer.querySelector('.flagged-section');

            flaggedSection.style.display = 'block';
            // Append to end of flagged section to preserve order of flags
            flaggedSection.appendChild(el);
          }
        }
      }
    });
  });
}

// Redefine createTreeElement to include index for sorting
function createTreeElement(data, key, path) {
  if (typeof data === "object" && data !== null) {
    const isArray = Array.isArray(data);
    const details = document.createElement("details");
    details.setAttribute("data-path", path);

    const summary = document.createElement("summary");
    const count = isArray ? data.length : Object.keys(data).length;
    summary.innerHTML = `<span class="key">${key}</span> <span style="color:var(--text-color); opacity:0.6">${isArray ? `[${count}]` : `{${count}}`}</span>`;
    details.appendChild(summary);

    const container = document.createElement("div");
    container.style.paddingLeft = "10px";

    const flaggedSection = document.createElement("div");
    flaggedSection.className = "flagged-section";
    flaggedSection.style.display = "none";
    container.appendChild(flaggedSection);

    const childrenContainer = document.createElement("div");
    childrenContainer.className = "children-section";
    container.appendChild(childrenContainer);

    Object.entries(data).forEach(([k, v], index) => {
      const currentPath = path ? `${path}.${k}` : k;
      const child = createTreeElement(v, k, currentPath);
      child.setAttribute("data-original-index", index); // Store index
      childrenContainer.appendChild(child);
    });

    details.appendChild(container);
    return details;
  } else {
    const field = document.createElement("div");
    field.className = "json-field";
    field.setAttribute("data-path", path);
    field.setAttribute("data-key", key);
    // Index will be set by parent loop if it's a direct child of object/array
    // But wait, createTreeElement returns the element, parent sets index.
    // Actually, I can't set it here easily for the recursive call's return value 
    // without passing it down. 
    // Better: Set it in the loop above.

    const flag = document.createElement("i");
    flag.className = "fas fa-flag flag-icon";
    flag.onclick = (e) => {
      e.stopPropagation();
      toggleFlag(path);
    };
    field.appendChild(flag);

    const content = document.createElement("div");
    content.innerHTML = `<span class="key">${key}:</span> <span class="${getTypeClass(data)}">${formatValue(data)}</span>`;
    field.appendChild(content);

    return field;
  }
}



