const registrationForm = document.querySelector('.registration-card');
const passwordField = document.querySelector('#password');
const confirmPasswordField = document.querySelector('#confirm_password');
const passwordMatchError = document.querySelector('.password-match-error');
const registrationMessage = document.querySelector('.registration-message');

function validatePasswordMatch() {
    const passwordsMatch = confirmPasswordField.value === '' || passwordField.value === confirmPasswordField.value;
    const showMismatch = confirmPasswordField.value !== '' && !passwordsMatch;

    confirmPasswordField.setCustomValidity(passwordsMatch ? '' : 'Passwords must match.');
    confirmPasswordField.setAttribute('aria-invalid', String(showMismatch));
    passwordMatchError.textContent = showMismatch ? 'Passwords do not match.' : '';
}

passwordField.addEventListener('input', validatePasswordMatch);
confirmPasswordField.addEventListener('input', validatePasswordMatch);

registrationForm.addEventListener('submit', (event) => {
    validatePasswordMatch();

    if (!registrationForm.checkValidity()) {
        event.preventDefault();
        registrationForm.reportValidity();
        return;
    }

    if (registrationForm.dataset.frontendOnly === 'true') {
        event.preventDefault();
        registrationMessage.textContent = 'Your details are ready. Account creation is not connected to a service yet.';
        registrationMessage.classList.add('is-success');
    }
});

document.querySelectorAll('[data-policy-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
    });
});
