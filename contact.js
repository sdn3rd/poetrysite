// contact.js

// Initialize the page
function initializeContactPage() {
    initializeTheme();
    initializeLanguage();
    initializeVolume();
    addContactEventListeners();
}

// Function to initialize theme
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        detectOSTheme();
    }

    // Update the theme toggle position
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
    }
}

// Apply the selected theme
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Detect OS theme preference
function detectOSTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDarkScheme ? 'dark' : 'light';
    applyTheme(theme);
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);

    // Update the theme toggle position
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (newTheme === 'dark');
    }
}

// Initialize language settings
let currentLanguage = 'en'; // Default language

function initializeLanguage() {
    let storedLanguage = localStorage.getItem('language');

    if (!storedLanguage) {
        const lang = navigator.language || navigator.userLanguage;
        if (lang.startsWith('it')) {
            currentLanguage = 'it';
        } else {
            currentLanguage = 'en';
        }
        localStorage.setItem('language', currentLanguage);
    } else {
        currentLanguage = storedLanguage;
    }

    setLanguage();
}

// Set the current language
function setLanguage() {
    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', currentLanguage);

    // Update toggle button text to show the language it will switch to
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.innerText = currentLanguage === 'en' ? 'Ita' : 'Eng';
    }

    // Update text elements on the page
    updateContentLanguage(currentLanguage);
}

// Toggle language
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'it' : 'en';
    localStorage.setItem('language', currentLanguage);
    setLanguage();
}

// Function to update text elements based on language
function updateContentLanguage(lang) {
    const elementsToUpdate = [
        { id: 'page-title', en: 'Leave feedback or request for takedown', it: 'Lascia un feedback o richiedi la rimozione' },
        { id: 'email-label', en: 'Your Email (optional):', it: 'La tua email (opzionale):' },
        { id: 'message-label', en: 'Your Message:', it: 'Il tuo messaggio:' },
        { id: 'submit-button', en: 'Send', it: 'Invia' },
        { id: 'back-link', en: '← Back', it: '← Indietro' },
        { id: 'contact-link', en: 'Contact', it: 'Contatto' },
        { id: 'patreon-link', en: 'Patreon', it: 'Patreon' }, // Assuming "Patreon" remains the same
        // Add more elements as needed
    ];

    elementsToUpdate.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            el.textContent = lang === 'en' ? element.en : element.it;
        }
    });
}

// Initialize volume control
function initializeVolume() {
    const volumeSlider = document.getElementById('volume-slider');
    const backgroundAudio = document.getElementById('background-audio');
    const savedVolume = localStorage.getItem('volume') || 0;

    if (volumeSlider && backgroundAudio) {
        volumeSlider.value = savedVolume;
        backgroundAudio.volume = savedVolume;

        if (savedVolume > 0) {
            backgroundAudio.muted = false;
            backgroundAudio.play();
        }

        volumeSlider.addEventListener('input', function () {
            backgroundAudio.volume = this.value;
            localStorage.setItem('volume', this.value);

            if (this.value > 0) {
                backgroundAudio.muted = false;
                backgroundAudio.play();
            } else {
                backgroundAudio.muted = true;
                backgroundAudio.pause();
            }
        });
    }
}

// Function to add additional event listeners
function addContactEventListeners() {
    // Event listener for language toggle
    const langToggleBtn = document.getElementById('lang-toggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }

    // Event listener for theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

// Run initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeContactPage);

