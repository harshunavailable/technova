// js/auth.js
function initLoginForm() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Logging in…';
    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const { token, user } = await api.post('/auth/login', { email, password });
      saveSession(token, user);
      toast(`Welcome back, ${user.fullName.split(' ')[0]}!`, 'success');
      setTimeout(() => location.href = user.role === 'admin' ? 'admin.html' : 'index.html', 500);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Log in';
    }
  });
}

function initRegisterForm() {
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value;
      const { token, user } = await api.post('/auth/register', { fullName, email, phone, password });
      saveSession(token, user);
      toast('Account created! Welcome to Technova.', 'success');
      setTimeout(() => location.href = 'index.html', 500);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = 'Create account';
    }
  });
}
