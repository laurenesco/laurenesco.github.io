// Function to sort the table data
function sortTable(event) {
    const table = event.target.closest("table"); // Get the parent table element
    const tbody = table.querySelector("tbody"); // Get the table body
    const rows = Array.from(tbody.querySelectorAll("tr")); // Get all table rows
  
    // Get the column index to sort
    const column = Array.from(event.target.parentNode.children).indexOf(event.target);
  
    // Get the current sorting order of the column
    const currentSortOrder = event.target.dataset.sortOrder || "asc";
    const sortOrder = currentSortOrder === "asc" ? "desc" : "asc";
    event.target.dataset.sortOrder = sortOrder;
  
    // Sort the rows based on the content of the selected column
    rows.sort((a, b) => {
      const cellA = a.querySelectorAll("td")[column].textContent.trim();
      const cellB = b.querySelectorAll("td")[column].textContent.trim();
      let result;
  
      // Apply different sorting based on the sorting style specified in the class of the header
      if (event.target.classList.contains("sortable-date")) {
        const dateA = new Date(cellA);
        const dateB = new Date(cellB);
        result = dateB - dateA;
      } else if (event.target.classList.contains("sortable-numeric")) {
        const numberA = parseFloat(cellA);
        const numberB = parseFloat(cellB);
        result = numberA - numberB;
      } else {
        result = cellA.localeCompare(cellB, undefined, { numeric: true, sensitivity: 'base' });
      }
  
      return sortOrder === "asc" ? result : -result;
    });
  
    // Remove existing rows from the table
    rows.forEach(row => tbody.removeChild(row));
  
    // Append the sorted rows back to the table
    rows.forEach(row => tbody.appendChild(row));

  // Apply alternating row colors
  applyAlternatingRowColors(table);
}

// Function to apply alternating row colors
function applyAlternatingRowColors(table) {
    const rows = table.querySelectorAll("tbody tr");
    const alternateClass = "alternate";
  
    // Remove existing row colors
    rows.forEach(row => row.classList.remove(alternateClass));
  
    // Add alternating row colors
    rows.forEach((row, index) => {
      if (index % 2 === 0) {
        row.classList.add(alternateClass);
      }
    });
}
  
// Find tables with class "sortable-onload-N" and sort by the specified column on load
const sortableTables = document.querySelectorAll("table[class*='sortable-onload-']");

sortableTables.forEach(table => {
  const headers = table.querySelectorAll("th");

  // Get the column index from the class name
  const classIndex = table.className.lastIndexOf("-") + 1;
  const column = parseInt(table.className.substring(classIndex), 10);

  // Add click event listener to each table header
  headers.forEach(header => {
    header.addEventListener("click", sortTable);
    header.style.cursor = "pointer"; // Change cursor to indicate sortable header
  });

  // Trigger the sorting based on the column index
  const headerToSort = headers[column];
  if (headerToSort) {
    // Set the initial sorting order to "asc" for the header to be sorted on load
    headerToSort.dataset.sortOrder = "desc";
    sortTable({ target: headerToSort }); // Manually trigger the sorting function
  }

  // Apply initial alternating row colors
  applyAlternatingRowColors(table);
});