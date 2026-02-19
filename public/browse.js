(function () {
  'use strict';

  try {
    var userJson = localStorage.getItem('streamnest_user');
    if (!userJson) {
      window.location.href = '/';
      return;
    }
    var user = JSON.parse(userJson);
    var userNameEl = document.getElementById('userName');
    if (userNameEl && user.username) userNameEl.textContent = user.username;
  } catch (_) {
    window.location.href = '/';
    return;
  }

  document.getElementById('signOut').addEventListener('click', function () {
    try { localStorage.removeItem('streamnest_user'); } catch (_) {}
    window.location.href = '/';
  });

  function getApiUrl(path, params) {
    var q = params ? new URLSearchParams(params).toString() : '';
    return window.location.origin + path + (q ? '?' + q : '');
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) { return r.json(); });
  }

  var heroSection = document.getElementById('heroSection');
  var heroTitle = document.getElementById('heroTitle');
  var heroMeta = document.getElementById('heroMeta');
  var featuredMovie = null;

  function setHero(movie) {
    if (!movie) return;
    featuredMovie = movie;
    heroTitle.textContent = movie.Title || 'Movie';
    var meta = [];
    if (movie.Year && movie.Year !== 'N/A') meta.push(movie.Year);
    if (movie.imdbRating && movie.imdbRating !== 'N/A') meta.push('IMDb ' + movie.imdbRating + '/10');
    heroMeta.textContent = meta.join(' · ');
    if (movie.Poster && movie.Poster !== 'N/A') {
      heroSection.style.backgroundImage = 'url(' + movie.Poster + ')';
    } else {
      heroSection.style.backgroundImage = '';
      heroSection.style.backgroundColor = 'var(--surface)';
    }
  }

  document.getElementById('heroPlay').addEventListener('click', function () {
    if (featuredMovie) openModal(featuredMovie.imdbID);
  });
  document.getElementById('heroTrailer').addEventListener('click', function () {
    if (featuredMovie) openModal(featuredMovie.imdbID);
  });

  function renderRow(containerId, list) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!list || !list.length) return;
    list.forEach(function (m) {
      var poster = (m.Poster && m.Poster !== 'N/A') ? m.Poster : 'https://via.placeholder.com/160x240/1a1820/9a94a0?text=No+Poster';
      var div = document.createElement('div');
      div.className = 'browse-poster';
      div.innerHTML = '<img src="' + poster + '" alt="' + escapeHtml(m.Title) + '" loading="lazy" /><div class="info"><div class="title">' + escapeHtml(m.Title) + '</div><div class="year">' + escapeHtml(m.Year || '') + '</div></div>';
      div.addEventListener('click', function () { openModal(m.imdbID); });
      container.appendChild(div);
    });
  }

  var modal = document.getElementById('modal');
  var modalBody = document.getElementById('modalBody');

  function openModal(imdbID) {
    fetchJson(getApiUrl('/api/movie/' + imdbID)).then(function (movie) {
      if (movie.Response === 'False') return;
      modalBody.innerHTML = '<h2 style="margin-bottom:0.5rem;">' + escapeHtml(movie.Title) + '</h2>' +
        '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:1rem;">' + escapeHtml(movie.Year || '') + ' · ' + escapeHtml(movie.Genre || '') + '</p>' +
        (movie.Poster && movie.Poster !== 'N/A' ? '<img src="' + movie.Poster + '" alt="" style="width:100%;border-radius:8px;margin-bottom:1rem;" />' : '') +
        '<p style="font-size:0.95rem;line-height:1.6;">' + escapeHtml(movie.Plot || 'No plot available.') + '</p>' +
        (movie.imdbRating && movie.imdbRating !== 'N/A' ? '<p style="margin-top:0.75rem;color:var(--accent);">IMDb ' + escapeHtml(movie.imdbRating) + '</p>' : '');
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
    });
  }

  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  // Load hero: use first result from a popular search, then get full details
  function loadHero() {
    fetchJson(getApiUrl('/api/movies', { s: 'action', page: 1 }))
      .then(function (data) {
        if (data.Search && data.Search.length) {
          var first = data.Search[0];
          return fetchJson(getApiUrl('/api/movie/' + first.imdbID));
        }
        return null;
      })
      .then(function (movie) {
        if (movie && movie.Response !== 'False') setHero(movie);
        else {
          heroTitle.textContent = 'STREAMNEST';
          heroMeta.textContent = 'Movies & TV Series';
        }
      })
      .catch(function () {
        heroTitle.textContent = 'STREAMNEST';
        heroMeta.textContent = 'Movies & TV Series';
      });
  }

  // Load rows with live OMDB data
  function loadRow(rowInnerId, query, type) {
    type = type || 'movie';
    fetchJson(getApiUrl('/api/movies', { s: query, page: 1, type: type }))
      .then(function (data) {
        renderRow(rowInnerId, data.Search || []);
      })
      .catch(function () {
        renderRow(rowInnerId, []);
      });
  }

  loadHero();
  loadRow('rowNewInner', '2024', 'movie');
  loadRow('rowTrendingInner', 'thriller', 'movie');
  loadRow('rowSeriesInner', 'series', 'series');
})();
