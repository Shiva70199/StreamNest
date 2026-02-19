// Shared auth helpers if needed (e.g. redirect if already logged in)
(function () {
  try {
    const user = localStorage.getItem('streamnest_user');
    if (user && (window.location.pathname === '/login.html' || window.location.pathname === '/signup.html')) {
      // Optional: auto-redirect logged-in users away from login/signup
      // window.location.href = '/';
    }
  } catch (_) {}
})();
