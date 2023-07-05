// Function to sort the table data
function sortTable(target) {
  let table;

  if (target instanceof Event) {
    // Event case: Retrieve table from event target
    table = target.target.closest("table");
  } else {
    // Parameter case: Use the provided table directly
    table = target;
  }

  // Retrieve table elements
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  // Parse column indices
  const classPrefix = "sortable-onload";
  const classList = table.className.split(" ");
  const sortableClass = classList.find(className => className.startsWith(classPrefix));
  const columnIndices = sortableClass.replace(classPrefix, "")
                                     .split("-")
                                     .filter(index => index !== "")
                                     .map(index => parseInt(index));

// Determine the sorting order of the column
const sortOrderElement = table.querySelector("[data-sort-order]");
const currentSortOrder = sortOrderElement ? sortOrderElement.dataset.sortOrder : "desc";
const sortOrder = currentSortOrder === "asc" ? "desc" : "asc";
if (sortOrderElement) {
  sortOrderElement.dataset.sortOrder = sortOrder;
}

  // Sort the rows based on the content of the selected column
  rows.sort((a, b) => {
    const cellA = a.querySelectorAll("td")[columnIndices[0]].textContent.trim();
    const cellB = b.querySelectorAll("td")[columnIndices[0]].textContent.trim();
    let result;

    if (table.querySelector(".sortable-date")) { // Date sort
      const dateA = new Date(cellA);
      const dateB = new Date(cellB);
      result = dateB - dateA;
    } else if (table.querySelector(".sortable-numeric")) { // Numeric sort
      const numberA = parseFloat(cellA);
      const numberB = parseFloat(cellB);
      result = numberA - numberB;
    } else {
      result = cellA.localeCompare(cellB, undefined, { numeric: true, sensitivity: 'base' }); // Alphanumeric sort [Default]
    }

    // Sort by secondary column
    if (result == 0 && columnIndices.length >= 2) {
      const secondColumn = columnIndices[1];
      const secondCellA = a.querySelectorAll("td")[secondColumn].textContent.trim();
      const secondCellB = b.querySelectorAll("td")[secondColumn].textContent.trim();

      if (table.querySelector(".sortable-date")) { // Date sort
        const dateA = new Date(secondCellA);
        const dateB = new Date(secondCellB);
        result = dateB - dateA;
      } else if (table.querySelector(".sortable-numeric")) { // Numeric sort
        const numberA = parseFloat(secondCellA);
        const numberB = parseFloat(secondCellB);
        result = numberA - numberB;
      } else {
        result = secondCellA.localeCompare(secondCellB, undefined, { numeric: true, sensitivity: 'base' }); // Alphanumeric sort
      }
    }

    return sortOrder === "asc" ? result : -result;
  });

  // Apply sort direction arrow
  applySortArrow(table, sortOrder, columnIndices[0]);

  // Remove and reappend rows in the table
  rows.forEach(row => tbody.removeChild(row));
  rows.forEach(row => tbody.appendChild(row));

  // Apply alternating row colors
  applyAlternatingRowColors(table);
}

// Function to apply sort direction arrow to headers
function applySortArrow(table, sortOrder, columnIndex) {
  const headers = table.querySelectorAll("th");
  headers.forEach((header, index) => {
    // Remove old arrow
    header.textContent = header.textContent.replace(/\u2191|\u2193/g, '').trim();
    // Add the new arrow
    if (index === columnIndex) {
      const sortOrderArrow = sortOrder === "asc" ? " \u2191" : " \u2193";
      header.textContent = header.textContent.trim() + sortOrderArrow;
    }
  });
}

// Function to apply alternating row colors
function applyAlternatingRowColors(table) {
  const rows = table.querySelectorAll("tbody tr");

  // Check if the table has the "rowstyle-alternateRow" class, if so, apply alternating colors
  if (table.classList.contains("rowstyle-alternateRow")) {
    // Apply alternating row colors
    rows.forEach((row, index) => {
      if (index % 2 === 0) {
        row.style.backgroundColor = "#F0F0F0";
      } else {
        row.style.backgroundColor = "#FFFFFF";
      }
    });
  }
}

//
//  Start script
//

// Find tables with class "sortable-onload-N" and sort by the specified column on load
const sortableTables = document.querySelectorAll("table[class*='sortable-onload-']");

sortableTables.forEach(table => {
  // Retrieve table elements
  const headers = table.querySelectorAll("th");

  // Isolate the correct class, necessary for tables with multiple classes
  const classPrefix = "sortable-onload";
  const classList = table.className.split(" ");
  const sortableClass = classList.find(className => className.startsWith(classPrefix));

  if (sortableClass) {
    // Add click event listener to each table header
    headers.forEach(header => {
      header.addEventListener("click", (event) => {
        sortTable(event);
      });

      if (header.textContent.trim() !== "") {
        header.style.cursor = "pointer"; 
        header.style.textDecoration = "underline";
        header.style.color = "#006699";
      }
    });

    // Trigger the sorting manually for default onload sort
    sortTable(table);
  }

  // Apply initial alternating row colors
  applyAlternatingRowColors(table);
});