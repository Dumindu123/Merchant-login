function merchantInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

function addAccountMenu(csrfToken) {
    document.querySelectorAll('.store-profile').forEach((profile) => {
        if (profile.dataset.accountMenuReady === 'true') {
            return;
        }

        profile.dataset.accountMenuReady = 'true';

        let trigger = profile.querySelector('.merchant-account-trigger');
        if (!trigger) {
            trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'merchant-account-trigger';
            while (profile.firstChild) {
                trigger.append(profile.firstChild);
            }
            profile.append(trigger);
        }
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Open merchant account menu');

        const menu = document.createElement('div');
        menu.className = 'merchant-account-menu';
        menu.hidden = true;
        menu.setAttribute('role', 'menu');

        const logoutForm = document.createElement('form');
        logoutForm.method = 'post';
        logoutForm.action = 'logout.php';

        const tokenField = document.createElement('input');
        tokenField.type = 'hidden';
        tokenField.name = 'csrf_token';
        tokenField.value = csrfToken;

        const logoutButton = document.createElement('button');
        logoutButton.type = 'submit';
        logoutButton.setAttribute('role', 'menuitem');
        logoutButton.textContent = 'Log out';
        logoutForm.append(tokenField, logoutButton);
        menu.append(logoutForm);
        profile.append(menu);

        const setMenuOpen = (isOpen) => {
            menu.hidden = !isOpen;
            trigger.setAttribute('aria-expanded', String(isOpen));
        };

        trigger.addEventListener('click', () => {
            setMenuOpen(menu.hidden);
        });

        profile.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !menu.hidden) {
                setMenuOpen(false);
                trigger.focus();
            }
        });

        document.addEventListener('click', (event) => {
            if (!profile.contains(event.target)) {
                setMenuOpen(false);
            }
        });
    });
}

window.addEventListener('merchant-profile-updated', (event) => {
    const { shopName, ownerName } = event.detail;

    document.querySelectorAll('.store-name').forEach((element) => {
        const name = element.firstChild;
        if (name && name.nodeType === Node.TEXT_NODE) {
            name.textContent = shopName;
        }
    });

    document.querySelectorAll('.store-avatar, .merchant-avatar').forEach((element) => {
        element.textContent = merchantInitials(shopName);
        if (element.hasAttribute('aria-label')) {
            element.setAttribute('aria-label', shopName);
        }
    });

    const profileName = document.querySelector('#merchant-name');
    if (profileName) {
        profileName.textContent = shopName;
    }

    const welcomeHeading = document.querySelector('[data-merchant-welcome]');
    if (welcomeHeading && welcomeHeading.firstChild?.nodeType === Node.TEXT_NODE) {
        welcomeHeading.firstChild.textContent = `Welcome, ${ownerName.split(/\s+/)[0]} `;
    }

    document.body.dataset.merchantName = shopName;
});

async function loadMerchantProfile() {
    try {
        const response = await fetch('merchant-session.php');

        if (response.status === 401) {
            window.location.replace('index.html?login=required');
            return;
        }

        const merchant = await response.json();

        if (!response.ok) {
            throw new Error(merchant.error || 'Could not load merchant details.');
        }

        window.merchantProfileCsrfToken = merchant.csrfToken;
        addAccountMenu(merchant.csrfToken);

        document.querySelectorAll('.store-name').forEach((element) => {
            const name = element.firstChild;
            if (name && name.nodeType === Node.TEXT_NODE) {
                name.textContent = merchant.shopName;
            }

            const id = element.querySelector('small');
            if (id) {
                id.textContent = merchant.merchantId;
            }
        });

        document.querySelectorAll('.store-avatar, .merchant-avatar').forEach((element) => {
            element.textContent = merchantInitials(merchant.shopName);
            if (element.hasAttribute('aria-label')) {
                element.setAttribute('aria-label', merchant.shopName);
            }
        });

        const profileName = document.querySelector('#merchant-name');
        if (profileName) {
            profileName.textContent = merchant.shopName;
        }

        const profileId = document.querySelector('[data-merchant-id]');
        if (profileId) {
            profileId.textContent = merchant.merchantId;
        }

        const welcomeHeading = document.querySelector('[data-merchant-welcome]');
        if (welcomeHeading && welcomeHeading.firstChild?.nodeType === Node.TEXT_NODE) {
            welcomeHeading.firstChild.textContent = `Welcome, ${merchant.ownerName.split(/\s+/)[0]} `;
        }

        const profileFields = {
            businessName: merchant.shopName,
            businessType: merchant.businessType,
            ownerName: merchant.ownerName,
            contactNumber: merchant.mobileNumber,
            email: merchant.email,
            whatsappNumber: merchant.whatsappNumber,
            streetAddress: merchant.address,
            city: merchant.city,
            district: merchant.district,
            bank: merchant.bankName,
            branch: merchant.bankBranch,
        };

        Object.entries(profileFields).forEach(([name, value]) => {
            const field = document.querySelector(`[name="${name}"]`);
            if (field) {
                field.value = value;
            }
        });

        document.body.dataset.merchantName = merchant.shopName;
        document.body.dataset.merchantId = merchant.merchantId;
    } catch (error) {
        console.error('Could not load the signed-in merchant profile.', error);
        return null;
    }

    return true;
}

window.merchantProfileReady = loadMerchantProfile();
