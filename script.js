const STORAGE_KEY = "reading-garden-books";

const starterBooks = [
  {
    id: "book-1",
    title: "The Secret Garden",
    author: "Frances Hodgson Burnett",
    status: "finished",
    progress: 100,
    note: "A little garden can change everything."
  },
  {
    id: "book-2",
    title: "Little Women",
    author: "Louisa May Alcott",
    status: "reading",
    progress: 42,
    note: "Growing up, family, and finding your own voice."
  },
  {
    id: "book-3",
    title: "The Wild Places",
    author: "Robert Macfarlane",
    status: "want",
    progress: 0,
    note: "A journey into the wild."
  }
];

const bookGrid = document.querySelector("#book-grid");
const bookCount = document.querySelector("#book-count");
const totalBooks = document.querySelector("#total-books");
const readingCount = document.querySelector("#reading-count");
const finishedCount = document.querySelector("#finished-count");

const searchInput = document.querySelector("#search-input");
const filterButtons = document.querySelectorAll(".filter-button");
const addBookButton = document.querySelector("#add-book-button");
const emptyMessage = document.querySelector("#empty-message");

const bookDialog = document.querySelector("#book-dialog");
const bookForm = document.querySelector("#book-form");
const dialogTitle = document.querySelector("#dialog-title");
const closeDialogButton = document.querySelector("#close-dialog");
const cancelDialogButton = document.querySelector("#cancel-dialog");

const progressField = document.querySelector("#progress-field");
const progressValue = document.querySelector("#progress-value");

let books = loadBooks();
let activeFilter = "all";
let editingBookId = null;

function loadBooks() {
  try {
    const savedBooks = localStorage.getItem(STORAGE_KEY);
    return savedBooks ? JSON.parse(savedBooks) : [...starterBooks];
  } catch (error) {
    console.error("Could not load saved books:", error);
    return [...starterBooks];
  }
}

function saveBooks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error("Could not save books:", error);
    alert("Your browser could not save the books. Please check your browser storage settings.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}


async function searchBookCover(title, author) {
  try {
    const params = new URLSearchParams({
      title: title,
      author: author,
      fields: "title,author_name,cover_i",
      limit: "5"
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`
    );

    if (!response.ok) {
      throw new Error("Book search failed");
    }

    const data = await response.json();
    const results = data.docs || [];

    const normalize = text =>
      text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

    const matchedBook = results.find(book => {
      const titleMatches =
        book.title &&
        normalize(book.title) === normalize(title);

      const authorMatches =
        !book.author_name ||
        book.author_name.some(name =>
          normalize(name).includes(normalize(author)) ||
          normalize(author).includes(normalize(name))
        );

      return titleMatches && authorMatches && book.cover_i;
    });

    const selectedBook =
      matchedBook || results.find(book => book.cover_i);

    if (!selectedBook) return "";

    return `https://covers.openlibrary.org/b/id/${selectedBook.cover_i}-M.jpg`;
  } catch (error) {
    console.warn("Could not retrieve book cover:", error);
    return "";
  }
}


function getStatusLabel(status) {
  const labels = {
    reading: "Reading",
    finished: "Finished",
    want: "Want to read"
  };

  return labels[status] || "Want to read";
}

function getStatusClass(status) {
  return ["reading", "finished", "want"].includes(status)
    ? status
    : "want";
}

function updateStats() {
  const total = books.length;
  const reading = books.filter(book => book.status === "reading").length;
  const finished = books.filter(book => book.status === "finished").length;

  totalBooks.textContent = String(total).padStart(2, "0");
  bookCount.textContent = `${String(total).padStart(2, "0")} ${total === 1 ? "BOOK" : "BOOKS"}`;
  readingCount.textContent = String(reading).padStart(2, "0");
  finishedCount.textContent = String(finished).padStart(2, "0");
}


function renderGarden() {
  const plantGrid = document.getElementById("plant-grid");
  const plantTotal = document.getElementById("plant-total");
  const seedCount = document.getElementById("seed-count");
  const growingCount = document.getElementById("growing-count");
  const bloomCount = document.getElementById("bloom-count");

  if (
    !plantGrid ||
    !plantTotal ||
    !seedCount ||
    !growingCount ||
    !bloomCount
  ) {
    return;
  }

  const seeds = books.filter(book => book.status === "want");
  const growing = books.filter(book => book.status === "reading");
  const blooming = books.filter(book => book.status === "finished");

  const formatCount = number => String(number).padStart(2, "0");

  plantTotal.textContent = `${formatCount(books.length)} PLANTS`;
  seedCount.textContent = formatCount(seeds.length);
  growingCount.textContent = formatCount(growing.length);
  bloomCount.textContent = formatCount(blooming.length);

  if (books.length === 0) {
    plantGrid.innerHTML = `
      <p class="plant-empty">
        Your garden is waiting for its first story. Add a book to plant a seed.
      </p>
    `;
    return;
  }

  plantGrid.innerHTML = books.map(book => {
    let emoji;
    let stage;

    if (book.status === "finished") {
      emoji = "🌼";
      stage = "In bloom";
    } else if (book.status === "reading") {
      const progress = Number(book.progress) || 0;

      if (progress >= 70) {
        emoji = "🌿";
      } else if (progress >= 35) {
        emoji = "🌱";
      } else {
        emoji = "🌰";
      }

      stage = `Growing · ${progress}%`;
    } else {
      emoji = "🌰";
      stage = "A little seed";
    }

    return `
      <article class="plant-card">
        <div class="plant-illustration" aria-hidden="true">
          ${emoji}
        </div>
        <h3 class="plant-name">${escapeHTML(book.title)}</h3>
        <span class="plant-stage">${stage}</span>
      </article>
    `;
  }).join("");
}


function renderBooks() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  const visibleBooks = books.filter(book => {
    const matchesFilter =
      activeFilter === "all" || book.status === activeFilter;

    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  bookGrid.innerHTML = visibleBooks.map((book, index) => {
    const safeTitle = escapeHTML(book.title);
    const safeAuthor = escapeHTML(book.author);
    const safeNote = escapeHTML(book.note || "");
    const statusClass = getStatusClass(book.status);
    const progress = Math.max(0, Math.min(100, Number(book.progress) || 0));

    return `
      <article class="book-card">
        
<div class="book-cover cover-${(index % 3) + 1}">
  ${
    book.coverUrl
      ? `<img
          class="book-cover-image"
          src="${escapeHTML(book.coverUrl)}"
          alt="Cover of ${safeTitle}"
          onerror="this.remove()"
        >`
      : ""
  }
  <span class="cover-label">${getStatusLabel(book.status)}</span>
  <div class="cover-title">${safeTitle}</div>
  <div class="cover-author">${safeAuthor}</div>
  <span class="cover-decoration" aria-hidden="true"></span>
</div>


        <div class="book-card-content">
          <div class="book-card-heading">
            <div>
              <h3>${safeTitle}</h3>
              <p class="book-author">${safeAuthor}</p>
            </div>
            <span class="status-badge ${statusClass}">
              ${getStatusLabel(book.status)}
            </span>
          </div>

          <p class="book-note">${safeNote || "No note added yet."}</p>

          <div class="progress-heading">
            <span>Reading progress</span>
            <span>${progress}%</span>
          </div>

          <div
            class="progress-track"
            role="progressbar"
            aria-label="Reading progress for ${safeTitle}"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${progress}"
          >
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>

          <div class="book-card-actions">
            <button class="text-button" data-action="edit" data-id="${escapeHTML(book.id)}">
              Edit
            </button>
            <button class="text-button delete-button" data-action="delete" data-id="${escapeHTML(book.id)}">
              Delete
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  emptyMessage.hidden = visibleBooks.length > 0;
  bookGrid.hidden = visibleBooks.length === 0;
  updateStats();
}
renderGarden();

function openAddDialog() {
  editingBookId = null;
  bookForm.reset();
  progressValue.textContent = "0%";
  dialogTitle.textContent = "Add a book";
  bookDialog.showModal();
}

function openEditDialog(bookId) {
  const book = books.find(item => item.id === bookId);
  if (!book) return;

  editingBookId = bookId;
  dialogTitle.textContent = "Edit your book";

  bookForm.elements.title.value = book.title;
  bookForm.elements.author.value = book.author;
  bookForm.elements.status.value = book.status;
  bookForm.elements.progress.value = book.progress;
  bookForm.elements.note.value = book.note || "";
  progressValue.textContent = `${book.progress}%`;

  bookDialog.showModal();
}

function closeDialog() {
  bookDialog.close();
  editingBookId = null;
  bookForm.reset();
  progressValue.textContent = "0%";
}

addBookButton.addEventListener("click", openAddDialog);
closeDialogButton.addEventListener("click", closeDialog);
cancelDialogButton.addEventListener("click", closeDialog);

searchInput.addEventListener("input", renderBooks);

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    filterButtons.forEach(item => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    renderBooks();
  });
});

progressField.addEventListener("input", () => {
  progressValue.textContent = `${progressField.value}%`;
});

bookForm.addEventListener("submit", async event => {
  event.preventDefault();

  const title = bookForm.elements.title.value.trim();
  const author = bookForm.elements.author.value.trim();
  const status = bookForm.elements.status.value;
  const progress = Number(bookForm.elements.progress.value);
  const note = bookForm.elements.note.value.trim();

  if (!title || !author) {
    alert("Please enter both a book title and an author.");
    return;
  }


const existingBook = editingBookId
    ? books.find(book => book.id === editingBookId)
    : null;

  let coverUrl = existingBook?.coverUrl || "";

  const titleChanged =
    existingBook &&
    (existingBook.title !== title || existingBook.author !== author);

  if (!existingBook || titleChanged) {
    const foundCover = await searchBookCover(title, author);

    if (foundCover) {
      coverUrl = foundCover;
    } else if (titleChanged) {
      coverUrl = "";
    }
  }

  const bookData = {
    title,
    author,
    status,
    progress: Math.max(0, Math.min(100, progress)),
    note,
    coverUrl
  };


  if (editingBookId) {
    books = books.map(book =>
      book.id === editingBookId ? { ...book, ...bookData } : book
    );
  } else {
    books.unshift({
      id: `book-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...bookData
    });
  }

  saveBooks();
  closeDialog();
  renderBooks();
});

bookGrid.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit") {
    openEditDialog(id);
  }

  if (action === "delete") {
    const book = books.find(item => item.id === id);
    if (!book) return;

    const confirmed = confirm(`Delete "${book.title}" from your Reading Garden?`);
    if (!confirmed) return;

    books = books.filter(item => item.id !== id);
    saveBooks();
    renderBooks();
  }
});

renderBooks();