// User Profile Component - Google-style user icon with name
function updateUserProfile() {
  const authLinks = document.getElementById('authLinks');
  if (!authLinks) return;
  
  if (localStorage.getItem('token')) {
    const username = localStorage.getItem('username') || 'User';
    const firstLetter = username.charAt(0).toUpperCase();
    
    authLinks.innerHTML = `
      <div class="user-profile">
        <div class="user-avatar" title="${username}">
          ${firstLetter}
        </div>
        <div class="user-name">${username}</div>
      </div>
      <a href="#" class="logout-link" onclick="localStorage.removeItem('token'); localStorage.removeItem('userId'); localStorage.removeItem('username'); window.location.href='/';">
        Logout
      </a>
    `;
  }
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateUserProfile);
} else {
  updateUserProfile();
}

