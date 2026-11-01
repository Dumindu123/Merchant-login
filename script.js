const passwordInput = document.querySelector('#password');
const passwordToggle = document.querySelector('.password-toggle');
const notice = document.querySelector('.inline-notice');

const loginResult = new URLSearchParams(window.location.search).get('login');

if (loginResult === 'invalid') {
    notice.textContent = 'Email or password is incorrect.';
} else if (loginResult === 'unavailable') {
    notice.textContent = 'Sign-in is temporarily unavailable. Please try again later.';
} else if (loginResult === 'required') {
    notice.textContent = 'Please sign in to view your merchant account.';
}

passwordToggle.addEventListener('click', () => {
    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    passwordToggle.setAttribute('aria-pressed', String(showPassword));
    passwordToggle.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
});

document.querySelectorAll('[data-notice]').forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        notice.textContent = link.dataset.notice;
    });
});

const slider = document.querySelector('.courier-slider');
const slides = Array.from(slider.querySelectorAll('.courier-slide'));
const dots = Array.from(slider.querySelectorAll('.slider-dot'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let currentSlide = 0;
let autoplay;

function showSlide(index) {
    currentSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === currentSlide;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
        slide.inert = !isActive;
    });

    dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === currentSlide;
        dot.classList.toggle('is-active', isActive);

        if (isActive) {
            dot.setAttribute('aria-current', 'true');
        } else {
            dot.removeAttribute('aria-current');
        }
    });
}

function stopAutoplay() {
    window.clearInterval(autoplay);
}

function startAutoplay() {
    stopAutoplay();

    if (!reducedMotion.matches) {
        autoplay = window.setInterval(() => showSlide(currentSlide + 1), 6000);
    }
}

slider.querySelector('.slider-previous').addEventListener('click', () => {
    showSlide(currentSlide - 1);
    startAutoplay();
});

slider.querySelector('.slider-next').addEventListener('click', () => {
    showSlide(currentSlide + 1);
    startAutoplay();
});

dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showSlide(index);
        startAutoplay();
    });
});

slider.addEventListener('mouseenter', stopAutoplay);
slider.addEventListener('mouseleave', startAutoplay);
slider.addEventListener('focusin', stopAutoplay);
slider.addEventListener('focusout', (event) => {
    if (!slider.contains(event.relatedTarget)) {
        startAutoplay();
    }
});

reducedMotion.addEventListener('change', startAutoplay);
startAutoplay();
