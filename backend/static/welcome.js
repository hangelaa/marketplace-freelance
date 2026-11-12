(async () => {
  const name = document.querySelector('#user-name');
  const error = document.querySelector('#welcome-error');
  const csrf = () => document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
  try {
    const response = await fetch('/api/auth/me/', {credentials: 'same-origin'});
    if (response.status === 401) { window.location.replace('/login/'); return; }
    if (!response.ok) throw new Error('اطلاعات حساب بارگذاری نشد.');
    const user = await response.json();
    name.textContent = user.name || user.email;
  } catch (reason) {
    error.textContent = reason.message || 'ارتباط با سرور برقرار نشد.';
  }
  document.querySelector('#logout-button').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const response = await fetch('/api/auth/logout/', {method: 'POST', credentials: 'same-origin', headers: {'X-CSRFToken': csrf()}});
      if (!response.ok) throw new Error('خروج انجام نشد.');
      window.location.replace('/login/');
    } catch (reason) {
      error.textContent = reason.message || 'ارتباط با سرور برقرار نشد.';
      button.disabled = false;
    }
  });
})();
