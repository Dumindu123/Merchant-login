const profileForm = document.querySelector('#store-profile-form');
const saveStatus = document.querySelector('#profile-save-status');
const saveButton = document.querySelector('#save-profile-button');
const sectionLinks = [...document.querySelectorAll('.profile-section-nav a')];

function getCurrentProfile() {
    return Object.fromEntries(new FormData(profileForm).entries());
}

async function initializeStoreProfile() {
    const profileLoaded = await window.merchantProfileReady;
    if (!profileLoaded) {
        saveStatus.textContent = 'Could not load your profile. Refresh the page and sign in again.';
        saveButton.disabled = true;
        return;
    }

    let savedProfile = getCurrentProfile();
    let saveTimer;
    let isSaving = false;

    function hasUnsavedChanges() {
        return JSON.stringify(getCurrentProfile()) !== JSON.stringify(savedProfile);
    }

    function scheduleSave() {
        window.clearTimeout(saveTimer);
        saveButton.disabled = !hasUnsavedChanges();

        if (!hasUnsavedChanges()) {
            saveStatus.textContent = '';
            return;
        }

        if (!profileForm.checkValidity()) {
            saveStatus.textContent = 'Complete valid details to save your changes.';
            return;
        }

        saveStatus.textContent = 'Unsaved changes';
        saveTimer = window.setTimeout(saveProfile, 800);
    }

    async function saveProfile() {
        if (!hasUnsavedChanges() || isSaving) {
            return;
        }

        if (!profileForm.checkValidity()) {
            saveStatus.textContent = 'Complete valid details to save your changes.';
            return;
        }

        const submittedProfile = getCurrentProfile();
        let savedSuccessfully = false;
        isSaving = true;
        saveButton.disabled = true;
        saveStatus.textContent = 'Saving changes...';

        try {
            const response = await fetch('store-profile-update.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': window.merchantProfileCsrfToken,
                },
                body: JSON.stringify(submittedProfile),
            });
            const result = await response.json();

            if (!response.ok) {
                const firstFieldError = Object.values(result.errors || {})[0];
                throw new Error(firstFieldError || result.error || 'Could not save your profile.');
            }

            if (profileForm.elements.namedItem('accountNumber').value === submittedProfile.accountNumber) {
                profileForm.elements.namedItem('accountNumber').value = '';
            }
            submittedProfile.accountNumber = '';
            savedProfile = submittedProfile;
            saveStatus.textContent = 'Changes saved to your account.';
            savedSuccessfully = true;
            window.dispatchEvent(new CustomEvent('merchant-profile-updated', {
                detail: {
                    shopName: submittedProfile.businessName,
                    ownerName: submittedProfile.ownerName,
                },
            }));
        } catch (error) {
            console.error('Could not save the merchant profile.', error);
            saveStatus.textContent = error instanceof Error
                ? error.message
                : 'Could not save your profile. Please try again.';
        } finally {
            isSaving = false;
            if (savedSuccessfully) {
                scheduleSave();
            } else {
                saveButton.disabled = !hasUnsavedChanges();
            }
        }
    }

    profileForm.addEventListener('input', scheduleSave);
    profileForm.addEventListener('change', scheduleSave);

    sectionLinks.forEach((link) => {
        link.addEventListener('click', () => {
            sectionLinks.forEach((sectionLink) => {
                sectionLink.classList.toggle('is-active', sectionLink === link);
                if (sectionLink === link) {
                    sectionLink.setAttribute('aria-current', 'location');
                } else {
                    sectionLink.removeAttribute('aria-current');
                }
            });
        });
    });

    const sectionObserver = new IntersectionObserver((entries) => {
        const visibleSection = entries
            .filter((entry) => entry.isIntersecting)
            .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (!visibleSection) {
            return;
        }

        sectionLinks.forEach((link) => {
            const isCurrent = link.hash === `#${visibleSection.target.id}`;
            link.classList.toggle('is-active', isCurrent);
            if (isCurrent) {
                link.setAttribute('aria-current', 'location');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }, {
        rootMargin: '-150px 0px -55% 0px',
        threshold: [0, 0.25, 0.5],
    });

    document.querySelectorAll('.profile-section').forEach((section) => sectionObserver.observe(section));

    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        window.clearTimeout(saveTimer);

        if (!profileForm.reportValidity()) {
            return;
        }

        saveProfile();
    });

    saveButton.disabled = true;
}

initializeStoreProfile();
