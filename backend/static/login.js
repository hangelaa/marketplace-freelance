(() => {
  const form = document.querySelector('#login-form');
  const email = document.querySelector('#email');
  const password = document.querySelector('#password');
  const toggle = document.querySelector('#toggle-password');
  const error = document.querySelector('#form-error');
  const emailError = document.querySelector('#email-error');
  const passwordError = document.querySelector('#password-error');
  const button = document.querySelector('#submit-button');
  const csrf = () => document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';

  toggle.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'پنهان کردن' : 'نمایش';
    toggle.setAttribute('aria-label', visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور');
    toggle.setAttribute('aria-pressed', String(visible));
    password.focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    emailError.textContent = '';
    passwordError.textContent = '';
    const value = email.value.trim();
    let invalid = false;
    if (!value) { emailError.textContent = 'ایمیل را وارد کنید.'; invalid = true; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { emailError.textContent = 'فرمت ایمیل معتبر نیست.'; invalid = true; }
    if (!password.value) { passwordError.textContent = 'رمز عبور را وارد کنید.'; invalid = true; }
    if (invalid) { (emailError.textContent ? email : password).focus(); return; }
    button.disabled = true;
    button.textContent = 'در حال ورود…';
    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf()},
        body: JSON.stringify({email: value, password: password.value})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'ورود انجام نشد.');
      window.location.assign(result.next || '/welcome/');
    } catch (reason) {
      error.textContent = reason instanceof TypeError ? 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.' : reason.message;
      password.focus();
    } finally {
      button.disabled = false;
      button.textContent = 'ورود';
    }
  });
  document.querySelectorAll('[data-unavailable]').forEach(link => link.addEventListener('click', event => event.preventDefault()));
})();
