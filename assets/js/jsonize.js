// Elements
const searchBtn = document.getElementById("searchBtn");
const scriptBtn = document.getElementById("scriptBtn");
const jsonInput = document.getElementById("jsonInput");
const output = document.getElementById("output");
const renderBtn = document.getElementById("renderBtn");
const reverseBtn = document.getElementById("reverseBtn");
const themeToggle = document.getElementById("themeToggle");
const navbarBrand = document.getElementById("navbarBrand");
const examplesBtn = document.getElementById("examplesBtn");
const scriptExamplePopup = document.getElementById("scriptExamplePopup");
const searchInline = document.getElementById("searchInline");
const scriptInline = document.getElementById("scriptInline");
const beautifyBtn = document.getElementById("beautifyBtn");
const originalBtn = document.getElementById("originalBtn");
const eraseBtn = document.getElementById("eraseBtn");

let matches = [];
let currentIndex = -1;
let lastSearchTerm = "";
let currentJsonData = null;
let isTreeView = false;
let isBeautified = false;
let originalJsonData = null; // Store the original JSON data

// Flagging system variables
let flaggedFields = new Map(); // Store flagged field info: path -> {element, originalParent, originalIndex, flagOrder}
let flagCounter = 0; // To maintain flag order

// Theme toggle functionality - using in-memory storage instead of localStorage
let currentTheme = "light";

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
  currentTheme = isDark ? "dark" : "light";
});

// Navbar brand click functionality
navbarBrand.addEventListener("click", () => {
  window.location.reload();
});

// Toggle show/hide inline inputs
searchBtn.addEventListener("click", () => {
  searchInline.style.display =
    searchInline.style.display === "none" ? "block" : "none";
  scriptInline.style.display = "none";
  if (searchInline.style.display === "block") {
    searchInline.focus();
  }
});

scriptBtn.addEventListener("click", () => {
  scriptInline.style.display =
    scriptInline.style.display === "none" ? "block" : "none";
  searchInline.style.display = "none";
  if (scriptInline.style.display === "block") {
    scriptInline.focus();
  }
});

// Script inline enter key handling
scriptInline.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    applyScript();
  }
});

// Examples button functionality
examplesBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  scriptExamplePopup.style.display =
    scriptExamplePopup.style.display === "block" ? "none" : "block";
});

// Example script selection
document.querySelectorAll("#scriptExamplePopup li").forEach((li) => {
  li.addEventListener("click", (e) => {
    e.stopPropagation();
    const script = li.getAttribute("data-script");
    scriptInline.value = script;
    scriptInline.style.display = "block";
    searchInline.style.display = "none";
    scriptExamplePopup.style.display = "none";
  });
});

// Close popups when clicking outside
document.addEventListener("click", (e) => {
  if (
    !scriptExamplePopup.contains(e.target) &&
    !examplesBtn.contains(e.target)
  ) {
    scriptExamplePopup.style.display = "none";
  }

  if (!e.target.closest(".panel-actions")) {
    if (!searchInline.contains(e.target) && !searchBtn.contains(e.target)) {
      searchInline.style.display = "none";
    }
    if (!scriptInline.contains(e.target) && !scriptBtn.contains(e.target)) {
      scriptInline.style.display = "none";
    }
  }
});

eraseBtn.addEventListener("click", () => {
  // Clear textarea
  jsonInput.value = "";
  
  // Clear output
  output.innerHTML = "";
  
  // Reset all states
  currentJsonData = null;
  originalJsonData = null;
  isTreeView = false;
  isBeautified = false;
  
  // Clear all flags
  clearAllFlags();
  
  // Force back to text mode without calling reverseToJson()
  jsonInput.style.display = "block";
  output.style.display = "none";
  renderBtn.style.display = "block";
  reverseBtn.style.display = "none";
  originalBtn.style.display = "none";
  beautifyBtn.innerHTML = '<i class="fas fa-magic"></i>';
  beautifyBtn.title = "Beautify JSON";
  originalBtn.style.display = "none";
  
  // Focus on input
  jsonInput.focus();
});

beautifyBtn.addEventListener("click", () => {
  const input = jsonInput.value.trim();
  if (!input) return;

  try {
    const json = JSON.parse(input);

    if (isTreeView) {
      // Minify: no spaces, no indentation
      reverseToJson();
      jsonInput.value = JSON.stringify(json);
      beautifyBtn.innerHTML = '<i class="fas fa-magic"></i>';
      beautifyBtn.title = "Beautify JSON";
      isBeautified = false;
    } else if (isBeautified) {
      // Minify: no spaces, no indentation
      jsonInput.value = JSON.stringify(json);
      beautifyBtn.innerHTML = '<i class="fas fa-magic"></i>';
      beautifyBtn.title = "Beautify JSON";
      isBeautified = false;
    } else {
      // Beautify: 2 spaces indentation
      jsonInput.value = JSON.stringify(json, null, 2);
      beautifyBtn.innerHTML = '<i class="fas fa-compress"></i>';
      beautifyBtn.title = "Minify JSON";
      isBeautified = true;
    }
  } catch (err) {
    // Show error briefly in the button
    const originalIcon = beautifyBtn.innerHTML;
    const originalTitle = beautifyBtn.title;
    beautifyBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    beautifyBtn.title = `Invalid JSON: ${err.message}`;

    setTimeout(() => {
      beautifyBtn.innerHTML = originalIcon;
      beautifyBtn.title = originalTitle;
    }, 2000);
  }
});

originalBtn.addEventListener("click", () => {
  if (!originalJsonData) {
    // Clear all flags when restoring original
    clearAllFlags();
    return;
  }

  // Restore original data
  currentJsonData = JSON.parse(JSON.stringify(originalJsonData)); // Deep copy

  if (isTreeView) {
    // Re-render tree view with original data
    output.innerHTML = "";
    output.appendChild(renderTree(currentJsonData));
    originalBtn.style.display = "none";
  } else {
    // Update text area with original data
    const beautifiedJson = JSON.stringify(currentJsonData, null, 2);
    jsonInput.value = beautifiedJson;

    // Update beautify button state
    isBeautified = true;
    beautifyBtn.innerHTML = '<i class="fas fa-compress"></i>';
    beautifyBtn.title = "Minify JSON";
    originalBtn.style.display = "none";
  }
});

// Enter key functionality for JSON input
jsonInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    renderJson();
  } else if (e.key === "Enter" && !e.shiftKey && !isTreeView) {
    e.preventDefault();
    renderJson();
  }
});

// Main render and reverse functionality
renderBtn.addEventListener("click", renderJson);
reverseBtn.addEventListener("click", reverseToJson);

function renderJson() {
  const input = jsonInput.value.trim();
  if (!input) {
    return;
  }

  try {
    const json = JSON.parse(input);

    if (!originalJsonData || !isTreeView) {
      originalJsonData = JSON.parse(JSON.stringify(json)); // Deep copy
      clearAllFlags(); // Clear flags when rendering new JSON
    }

    currentJsonData = json;

    // Hide textarea and show tree view
    jsonInput.style.display = "none";
    output.style.display = "block";
    renderBtn.style.display = "none";
    reverseBtn.style.display = "block";

    output.innerHTML = "";
    output.appendChild(renderTree(json));
    isTreeView = true;
  } catch (err) {
    output.innerHTML = `<div class="error">Invalid JSON: ${err.message}</div>`;
    jsonInput.style.display = "none";
    output.style.display = "block";
    renderBtn.style.display = "none";
    reverseBtn.style.display = "block";
    currentJsonData = null;
    isTreeView = true;
  }
}

function reverseToJson() {
  // Show textarea and hide tree view
  jsonInput.style.display = "block";
  output.style.display = "none";
  renderBtn.style.display = "block";
  reverseBtn.style.display = "none";
  originalBtn.style.display = "none";
  beautifyBtn.innerHTML = '<i class="fas fa-compress"></i>';
  isTreeView = false;
  isBeautified = true;

  if (currentJsonData) {
    try {
      const beautifiedJson = JSON.stringify(currentJsonData, null, 2);
      jsonInput.value = beautifiedJson;

      // Update beautify button state since we're returning beautified JSON
      isBeautified = true;
      beautifyBtn.innerHTML = '<i class="fas fa-compress"></i>';
      beautifyBtn.title = "Minify Json";
    } catch (err) {
      console.error("Error reversing JSON:", err);
    }
  }

  jsonInput.focus();
}

// Search functionality
searchInline.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSearch(searchInline.value);
  }
});

function handleSearch(term) {
  if (!isTreeView || !currentJsonData) return;

  clearHighlights();
  matches = [];
  currentIndex = -1;
  if (!term) return;

  lastSearchTerm = term;

  // Find paths containing the term
  const foundPaths = findPathsContainingTerm(currentJsonData, term);

  // Expand paths and highlight as callback
  expandPathsLazy(foundPaths, () => {
    highlightMatches(term);

    if (matches.length > 0) {
      currentIndex = 0;
      updateActiveMatch();
    }
  });
}

// Find paths in JSON - Key + Value search
function findPathsContainingTerm(obj, term, path = "") {
  let paths = [];
  const lowerTerm = term.toLowerCase();

  if (typeof obj === "object" && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Key match
      if (key.toLowerCase().includes(lowerTerm)) {
        paths.push(currentPath);
      }

      // Value match
      if (
        typeof value !== "object" &&
        String(value).toLowerCase().includes(lowerTerm)
      ) {
        paths.push(currentPath);
      }

      // Traverse sub-objects
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

  // Open root details and wait for render completion
  const rootDetails = output.querySelector("details");
  if (rootDetails && !rootDetails.open) {
    rootDetails.open = true;

    const rootContainer = rootDetails.querySelector("div");
    waitForChildren(rootContainer, () => {
      // After root render completes, start path chain
      paths.forEach((path) => {
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
    // Root is already open, start directly
    const rootContainer = rootDetails
      ? rootDetails.querySelector("div")
      : output;
    paths.forEach((path) => {
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

// Expand segments in chain
function expandSegmentChain(container, segments, index, done) {
  if (index >= segments.length) {
    done();
    return;
  }

  const seg = segments[index];
  const summaries = container.querySelectorAll("summary");
  let matchSummary = null;

  summaries.forEach((summary) => {
    const keySpan = summary.querySelector(".key");
    if (keySpan && keySpan.textContent.replace(/:$/, "") === seg) {
      matchSummary = summary;
    }
  });

  if (!matchSummary) {
    done(); // Exit if not found
    return;
  }

  const detail = matchSummary.parentElement;
  if (!detail.open) detail.open = true;

  const childContainer = detail.querySelector("div");

  if (childContainer) {
    // If child nodes not rendered yet, wait and continue
    waitForChildren(childContainer, () => {
      expandSegmentChain(childContainer, segments, index + 1, done);
    });
  } else {
    done();
  }
}

// Wait for children to load
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

// Highlight function
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

// Flagging system functions
function generateFieldPath(element) {
  const path = [];
  let current = element;

  while (current && current !== output) {
    if (current.classList && current.classList.contains("json-field")) {
      const keyElement = current.querySelector(".key");
      if (keyElement) {
        const keyText = keyElement.textContent.replace(/:$/, "");
        path.unshift(keyText);
      }
    }
    current = current.parentElement;
  }

  return path.join(".");
}

function toggleFlag(element, flagIcon) {
  const fieldPath = generateFieldPath(element);

  if (flaggedFields.has(fieldPath)) {
    // Unflag the field
    unflagField(fieldPath, element, flagIcon);
  } else {
    // Flag the field
    flagField(fieldPath, element, flagIcon);
  }
}

function flagField(fieldPath, element, flagIcon) {
  const originalParent = element.parentElement;

  // Calculate the correct original index (excluding flagged sections)
  const allSiblings = Array.from(originalParent.children);
  const nonFlaggedSiblings = allSiblings.filter(
    (child) => !child.classList.contains("flagged-section")
  );
  const originalIndex = nonFlaggedSiblings.indexOf(element);

  // Store original position info
  flaggedFields.set(fieldPath, {
    element: element,
    originalParent: originalParent,
    originalIndex: originalIndex,
    flagOrder: flagCounter++,
  });

  // Update visual state
  element.classList.add("flagged");
  flagIcon.classList.add("flagged");
  flagIcon.innerHTML = '<i class="fas fa-flag"></i>';

  // Move to flagged section in the same parent
  moveToFlaggedSection(element, originalParent);
}

function unflagField(fieldPath, element, flagIcon) {
  const flagInfo = flaggedFields.get(fieldPath);
  if (!flagInfo) return;

  // Remove from flagged fields
  flaggedFields.delete(fieldPath);

  // Update visual state
  element.classList.remove("flagged");
  flagIcon.classList.remove("flagged");
  flagIcon.innerHTML = '<i class="far fa-flag"></i>';

  // Store reference to the flagged section before moving element
  const flaggedSection = element.closest(".flagged-section");

  // Move back to original position
  moveToOriginalPosition(element, flagInfo);

  // Clean up the specific flagged section after moving the element
  if (flaggedSection && flaggedSection.children.length === 0) {
    flaggedSection.remove();
  }

  // Global cleanup to ensure no empty flagged sections remain
  cleanupAllEmptyFlaggedSections();
}

function moveToFlaggedSection(element, originalParent) {
  // Check if flagged section already exists in THIS specific container
  let flaggedSection = originalParent.querySelector(
    ":scope > .flagged-section"
  );

  if (!flaggedSection) {
    // Create flagged section at the very top of this container
    flaggedSection = document.createElement("div");
    flaggedSection.className = "flagged-section";
    // Add some basic styling to prevent visual issues
    flaggedSection.style.borderBottom = "1px solid transparent";
    flaggedSection.style.marginBottom = "4px";
    originalParent.insertBefore(flaggedSection, originalParent.firstChild);
  }

  // Move element to flagged section while maintaining flag order
  const flagInfo = flaggedFields.get(generateFieldPath(element));
  const existingFlagged = Array.from(flaggedSection.children);

  let insertIndex = existingFlagged.length;
  for (let i = 0; i < existingFlagged.length; i++) {
    const existingPath = generateFieldPath(existingFlagged[i]);
    const existingFlagInfo = flaggedFields.get(existingPath);
    if (existingFlagInfo && existingFlagInfo.flagOrder > flagInfo.flagOrder) {
      insertIndex = i;
      break;
    }
  }

  if (insertIndex >= existingFlagged.length) {
    flaggedSection.appendChild(element);
  } else {
    flaggedSection.insertBefore(element, existingFlagged[insertIndex]);
  }
}

function moveToOriginalPosition(element, flagInfo) {
  const { originalParent, originalIndex } = flagInfo;

  // Get all children except flagged sections
  const allChildren = Array.from(originalParent.children);
  const nonFlaggedChildren = allChildren.filter(
    (child) => !child.classList.contains("flagged-section")
  );

  // Find the correct insertion point based on original index
  if (originalIndex === 0) {
    // If it was the first element, find the first non-flagged-section element
    const firstNonFlagged = allChildren.find(
      (child) => !child.classList.contains("flagged-section")
    );
    if (firstNonFlagged) {
      originalParent.insertBefore(element, firstNonFlagged);
    } else {
      originalParent.appendChild(element);
    }
  } else if (originalIndex >= nonFlaggedChildren.length) {
    // If it was at the end, append it
    originalParent.appendChild(element);
  } else {
    // Find the element that should come after this one
    let targetElement = null;
    let currentNonFlaggedIndex = 0;

    for (const child of allChildren) {
      if (!child.classList.contains("flagged-section")) {
        if (currentNonFlaggedIndex === originalIndex) {
          targetElement = child;
          break;
        }
        currentNonFlaggedIndex++;
      }
    }

    if (targetElement) {
      originalParent.insertBefore(element, targetElement);
    } else {
      originalParent.appendChild(element);
    }
  }
}

function cleanupFlaggedSection(parent) {
  const flaggedSections = parent.querySelectorAll(":scope > .flagged-section");
  flaggedSections.forEach((section) => {
    if (section.children.length === 0) {
      section.remove();
    }
  });
}

function clearAllFlags() {
  // Restore all flagged elements to their original positions
  for (const [fieldPath, flagInfo] of flaggedFields.entries()) {
    const { element } = flagInfo;
    const flagIcon = element.querySelector(".flag-icon");

    if (element && flagIcon) {
      element.classList.remove("flagged");
      flagIcon.classList.remove("flagged");
      flagIcon.innerHTML = '<i class="far fa-flag"></i>';
      moveToOriginalPosition(element, flagInfo);
    }
  }

  // Clear the flagged fields map and reset counter
  flaggedFields.clear();
  flagCounter = 0;

  // Clean up all flagged sections
  cleanupAllEmptyFlaggedSections();
}

function cleanupAllEmptyFlaggedSections() {
  const allFlaggedSections = document.querySelectorAll(".flagged-section");
  allFlaggedSections.forEach((section) => {
    if (section.children.length === 0) {
      section.remove();
    }
  });
}

// Tree rendering functions
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

    // Lazy loading: empty container and flag
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
    const fieldContainer = document.createElement("div");
    fieldContainer.className = "json-field";
    fieldContainer.style.margin = "2px 0";

    // Create flag icon
    const flagIcon = document.createElement("span");
    flagIcon.className = "flag-icon";
    flagIcon.innerHTML = '<i class="far fa-flag"></i>';
    flagIcon.title = "Flag this field";

    // Add click handler for flag
    flagIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFlag(fieldContainer, flagIcon);
    });

    const contentDiv = document.createElement("div");
    contentDiv.style.display = "flex";
    contentDiv.style.alignItems = "center";
    contentDiv.style.flex = "1";

    const keySpan = document.createElement("span");
    keySpan.className = "key";
    keySpan.textContent = key ? `${key}: ` : "";

    const valueSpan = document.createElement("span");
    valueSpan.className = getTypeClass(data);
    valueSpan.textContent = formatValue(data);

    contentDiv.appendChild(keySpan);
    contentDiv.appendChild(valueSpan);

    fieldContainer.appendChild(flagIcon);
    fieldContainer.appendChild(contentDiv);

    return fieldContainer;
  }
}

function renderChildrenChunked(data, container) {
  const entries = Object.entries(data);
  let i = 0;
  const CHUNK_SIZE = 20; // Adjustable for performance

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

function clearHighlights() {
  matches.forEach((span) => {
    span.outerHTML = span.innerText;
  });
  matches = [];
  currentIndex = -1;
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

function applyScript() {
  const script = scriptInline.value.trim();
  if (!script) return;

  if (!isTreeView) {
    // If in text mode, try to parse and apply script
    const raw = jsonInput.value.trim();
    if (!raw) return;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      output.innerHTML = `<div class="error">Invalid JSON: ${e.message}</div>`;
      jsonInput.style.display = "none";
      output.style.display = "block";
      renderBtn.style.display = "none";
      reverseBtn.style.display = "block";
      currentJsonData = null;
      isTreeView = true;
      return;
    }

    try {
      const scriptResult = eval(
        `(() => { const data = ${JSON.stringify(
          parsed
        )}; return ${script}; })()`
      );
      currentJsonData = scriptResult;
      originalBtn.style.display = "block"; 

      // Switch to tree view
      jsonInput.style.display = "none";
      output.style.display = "block";
      renderBtn.style.display = "none";
      reverseBtn.style.display = "block";
      isTreeView = true;

      // Clear flags before re-rendering
      clearAllFlags();
      output.innerHTML = "";
      output.appendChild(renderTree(scriptResult));
    } catch (e) {
      output.innerHTML = `<div class="error">Script error: ${e.message}</div>`;
      jsonInput.style.display = "none";
      output.style.display = "block";
      renderBtn.style.display = "none";
      reverseBtn.style.display = "block";
      currentJsonData = null;
      isTreeView = true;
    }
  } else {
    // If in tree view, apply script to current data
    if (!currentJsonData) return;

    try {
      const scriptResult = eval(
        `(() => { const data = ${JSON.stringify(
          currentJsonData
        )}; return ${script}; })()`
      );
      currentJsonData = scriptResult;
      originalBtn.style.display = "block"; 
      output.innerHTML = "";
      output.appendChild(renderTree(scriptResult));
    } catch (e) {
      output.innerHTML = `<div class="error">Script error: ${e.message}</div>`;
      currentJsonData = null;
    }
  }
}
