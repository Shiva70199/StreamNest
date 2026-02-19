const API = '';
const grid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMore');
const noResults = document.getElementById('noResults');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');

let currentSearch = 'movie';
let currentPage = 1;
let totalResults = 0;

function getApiUrl(path, params = {}) {
  const q = new URLSearchParams(params).toString();
  return `${window.location.origin}${path}${q ? '?' + q : ''}`;
}

async function fetchMovies(search, page = 1) {
  const res = await fetch(getApiUrl('/api/movies', { s: search, page }));
  return res.json();
}

function renderSkeletons(count = 6) {
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'skeleton';
    el.setAttribute('aria-hidden', 'true');
    grid.appendChild(el);
  }
}

function renderMovies(data, append = false) {
  if (!append) grid.innerHTML = '';
  if (!data.Search || !data.Search.length) {
    if (!append) {
      grid.innerHTML = '';
      noResults.classList.remove('hidden');
    }
    loadMoreWrap.classList.add('hidden');
    return;
  }
  noResults.classList.add('hidden');
  totalResults = parseInt(data.totalResults, 10) || 0;
  const totalPages = Math.ceil(totalResults / 10);

  data.Search.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <img src="${m.Poster && m.Poster !== 'N/A' ? m.Poster : 'https://via.placeholder.com/180x270/1a1820/9a94a0?text=No+Poster'}" alt="${escapeAttr(m.Title)}" loading="lazy" />
      <div class="info">
        <div class="title">${escapeHtml(m.Title)}</div>
        <div class="year">${escapeHtml(m.Year || '')}</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(m.imdbID));
    grid.appendChild(card);
  });

  if (currentPage < totalPages) {
    loadMoreWrap.classList.remove('hidden');
  } else {
    loadMoreWrap.classList.add('hidden');
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

async function openModal(id) {
  const res = await fetch(getApiUrl(`/api/movie/${id}`));
  const movie = await res.json();
  if (movie.Response === 'False') return;
  modalBody.innerHTML = `
    <h2 style="margin-bottom:0.5rem;">${escapeHtml(movie.Title)}</h2>
    <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">${escapeHtml(movie.Year || '')} · ${escapeHtml(movie.Genre || '')}</p>
    ${movie.Poster && movie.Poster !== 'N/A' ? `<img src="${movie.Poster}" alt="" style="width:100%;border-radius:8px;margin-bottom:1rem;" />` : ''}
    <p style="font-size:0.95rem;line-height:1.6;">${escapeHtml(movie.Plot || 'No plot available.')}</p>
    ${movie.imdbRating && movie.imdbRating !== 'N/A' ? `<p style="margin-top:0.75rem;color:var(--accent);">IMDb ${escapeHtml(movie.imdbRating)}</p>` : ''}
  `;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
modal.querySelector('.modal-close').addEventListener('click', closeModal);

async function load(search, page = 1, append = false) {
  renderSkeletons();
  const data = await fetchMovies(search, page);
  renderMovies(data, append);
}

searchBtn.addEventListener('click', () => {
  currentSearch = searchInput.value.trim() || 'movie';
  currentPage = 1;
  load(currentSearch, 1);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    currentSearch = searchInput.value.trim() || 'movie';
    currentPage = 1;
    load(currentSearch, 1);
  }
});

loadMoreBtn.addEventListener('click', () => {
  currentPage += 1;
  fetchMovies(currentSearch, currentPage).then((data) => {
    renderMovies(data, true);
  });
});

load('movie', 1);
