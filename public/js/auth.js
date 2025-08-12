document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUri = urlParams.get('redirect_uri');
  const googleLoginBtn = document.getElementById('google-login-btn');

  let loginUrl = '/auth/google';
  if (redirectUri) {
    loginUrl += `?redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  if (googleLoginBtn) {
    googleLoginBtn.href = loginUrl;
  }
});
