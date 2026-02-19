// Redirect logged-in users from auth pages to browse
(function () {
  try {
    const user = localStorage.getItem('streamnest_user');
    if (user && (window.location.pathname === '/login.html' || window.location.pathname === '/signup.html')) {
      window.location.href = '/browse.html';
    }
  } catch (_) {}
})();
