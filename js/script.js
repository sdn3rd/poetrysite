// script.js
(() => {
    let currentLanguage = 'en';
    let currentPoemSet = 'main';
    let lastViewedPoemId = null;
    let savedVolume = 0.3;
    let isUpdating = false;
    const stateKey = 'spectralTapestryState';
    let sortOrders = {};
  
    // For double-tap on day-count
    let lastTapTime = 0;
    const doubleTapThreshold = 500;
    let tapTimeout = null;
  
    // Attach references so other modules can see or update them if needed
    window.scriptState = {
      currentLanguage,
      currentPoemSet,
      lastViewedPoemId,
      savedVolume,
      isUpdating,
      sortOrders,
    };
  
    document.addEventListener('DOMContentLoaded', initializePage);
  
    async function initializePage() {
      try {
        loadState();
        await window.CacheManager.initDB();
  
        // checkAndRefreshCache from CacheManager
        await window.CacheManager.checkAndRefreshCache(
          window.CacheManager.getLastCacheDate,
          async (isManualRefresh) => {
            // pass in any needed references
            await window.CacheManager.updateCache(
              ['poetry.json', 'caliope.json', 'lupa.json', 'experiments.json', 'strands.json'],
              setIsUpdating,
              PoemsManager.updateCloudIconState,
              { current: [] }, // pointer to currentPoems
              PoemsManager.isPuzzlePoemInserted,
              PoemsManager.insertPuzzlePoem,
              window.CacheManager.storeCachedData,
              window.CacheManager.setLastCacheDate
            );
          },
          currentLanguage
        );
  
        initializeTheme();
        initializeLanguage();
  
        // Let PoemsManager know about these
        PoemsManager.setCurrentLanguage(currentLanguage);
        PoemsManager.setCurrentPoemSet(currentPoemSet);
        PoemsManager.setSavedVolume(savedVolume);
        PoemsManager.initDefaultSortOrders();
        PoemsManager.setSortOrders(sortOrders);
  
        await PoemsManager.loadPoemsFromSet(PoemsManager.getJsonFileForCurrentSet());
        PoemsManager.updateSortToggleLabel();
        PoemsManager.updateSideMenuIcons(document.documentElement.getAttribute('data-theme'));
        PoemsManager.updateFooterText();
        addEventListeners();
        PoemsManager.updateDayCount();
        PoemsManager.startPulsing();
  
        // Periodic 1-hour updates
        setInterval(async () => {
          await window.CacheManager.updateCache(
            ['poetry.json', 'caliope.json', 'lupa.json', 'experiments.json', 'strands.json'],
            setIsUpdating,
            PoemsManager.updateCloudIconState,
            { current: [] },
            PoemsManager.isPuzzlePoemInserted,
            PoemsManager.insertPuzzlePoem,
            window.CacheManager.storeCachedData,
            window.CacheManager.setLastCacheDate
          );
        }, 3600000); // every hour
      } catch (error) {
        console.error('Error during initialization:', error);
        setIsUpdating(false);
        PoemsManager.updateCloudIconState();
      }
  
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered with scope:', registration.scope);
          await navigator.serviceWorker.ready;
          if (navigator.serviceWorker.controller) {
            window.CacheManager.cacheAudioFilesUpToLastCacheDate(window.CacheManager.getLastCacheDate);
          } else {
            console.warn('Service Worker not controlling yet. Reload to enable caching.');
            navigator.serviceWorker.oncontrollerchange = () => {
              if (navigator.serviceWorker.controller) {
                window.CacheManager.cacheAudioFilesUpToLastCacheDate(
                  window.CacheManager.getLastCacheDate
                );
              }
            };
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      } else {
        console.warn('Service Worker not supported.');
      }
    }
  
    function loadState() {
      const savedState = localStorage.getItem(stateKey);
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.preferredLanguage) currentLanguage = state.preferredLanguage;
          if (state.sortOrders) sortOrders = state.sortOrders;
          if (state.lastViewedPoemId) lastViewedPoemId = state.lastViewedPoemId;
          if (state.currentPoemSet) currentPoemSet = state.currentPoemSet;
          if (state.savedVolume !== undefined) savedVolume = state.savedVolume;
        } catch (error) {
          console.warn('Error parsing saved state:', error);
        }
      } else {
        // init default sort
        const sets = ['main', 'lupa', 'caliope', 'experiment', 'strands'];
        sets.forEach((s) => {
          if (!sortOrders[s]) {
            sortOrders[s] = 'desc';
          }
        });
      }
    }
  
    function initializeTheme() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        applyTheme(savedTheme);
      } else {
        detectOSTheme();
      }
    }
  
    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      PoemsManager.updateIconsForTheme(theme);
      if (PoemsManager.currentExpandedPoem && PoemsManager.currentExpandedPoem.wrapper) {
        PoemsManager.applyCustomBackground(
          PoemsManager.currentExpandedPoem.poem,
          PoemsManager.currentExpandedPoem.wrapper
        );
      }
      PoemsManager.updatePlayPauseIcons();
      PoemsManager.updateDayCountImage();
    }
  
    function detectOSTheme() {
      const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = prefersDarkScheme ? 'dark' : 'light';
      applyTheme(theme);
    }
  
    function initializeLanguage() {
      const storedLanguage = localStorage.getItem('language');
      if (storedLanguage) {
        currentLanguage = storedLanguage;
      } else {
        const lang = navigator.language || navigator.userLanguage;
        currentLanguage = lang.startsWith('it') ? 'it' : 'en';
        localStorage.setItem('language', currentLanguage);
      }
    }
  
    function addEventListeners() {
      const hamburgerMenu = document.getElementById('hamburger-menu');
      const sideMenu = document.getElementById('side-menu');
      if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', (evt) => {
          evt.stopPropagation();
          sideMenu.classList.add('visible');
          hamburgerMenu.classList.add('hidden');
          const patreonIcon = document.getElementById('patreon-icon-container');
          if (patreonIcon) patreonIcon.classList.add('hidden');
        });
      }
      document.addEventListener('click', (evt) => {
        if (!sideMenu.contains(evt.target) && !hamburgerMenu.contains(evt.target)) {
          PoemsManager.closeSideMenu();
        }
      });
  
      // side menu links
      const homeLink = document.getElementById('home-link');
      const caliopeLink = document.getElementById('caliope-link');
      const lupaLink = document.getElementById('lupa-link');
      const experimentsLink = document.getElementById('experiments-link');
      const strandsLink = document.getElementById('strands-link');
      if (homeLink) homeLink.addEventListener('click', () => PoemsManager.switchPoemSet('main', 'poetry.json'));
      if (caliopeLink)
        caliopeLink.addEventListener('click', () =>
          PoemsManager.switchPoemSet('caliope', 'caliope.json')
        );
      if (lupaLink)
        lupaLink.addEventListener('click', () =>
          PoemsManager.switchPoemSet('lupa', 'lupa.json')
        );
      if (experimentsLink)
        experimentsLink.addEventListener('click', () =>
          PoemsManager.switchPoemSet('experiment', 'experiments.json')
        );
      if (strandsLink)
        strandsLink.addEventListener('click', () =>
          PoemsManager.switchPoemSet('strands', 'strands.json')
        );
  
      const langToggleBtn = document.getElementById('lang-toggle');
      if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
          PoemsManager.toggleLanguage();
          PoemsManager.updateFooterText();
        });
      }
      const darkModeToggle = document.getElementById('dark-mode-toggle');
      if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleTheme);
      }
      const expandAllBtn = document.getElementById('expand-all');
      const collapseAllBtn = document.getElementById('collapse-all');
      if (expandAllBtn)
        expandAllBtn.addEventListener('click', () => PoemsManager.expandAllPoems && PoemsManager.expandAllPoems());
      if (collapseAllBtn)
        collapseAllBtn.addEventListener('click', () => PoemsManager.collapseAllPoems());
  
      const sortToggleBtn = document.getElementById('sort-toggle');
      if (sortToggleBtn) {
        sortToggleBtn.addEventListener('click', () => {
          PoemsManager.toggleSortOrder();
        });
      }
  
      const cloudRefreshBtn = document.getElementById('cloud-refresh');
      if (cloudRefreshBtn) {
        cloudRefreshBtn.addEventListener('click', async () => {
          if (!isUpdating) {
            const userConfirmed = await window.CacheManager.showResetCachePopup(currentLanguage);
            if (userConfirmed) {
              setIsUpdating(true);
              PoemsManager.updateCloudIconState();
              await window.CacheManager.clearCache();
              setIsUpdating(false);
              PoemsManager.updateCloudIconState();
            } else {
              console.log('User chose not to reset cache.');
            }
          }
        });
      }
  
      const dayCountElement = document.getElementById('day-count');
      if (dayCountElement) {
        dayCountElement.addEventListener('click', handleDayCountTap);
        dayCountElement.addEventListener('touchstart', handleDayCountTap);
      }
  
      const overlay = document.getElementById('laughingman-overlay');
      if (overlay) {
        overlay.addEventListener('click', PoemsManager.hideLaughingManOverlay);
        overlay.addEventListener('touchstart', PoemsManager.hideLaughingManOverlay);
      }
  
      if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          window.CacheManager.handleServiceWorkerMessages(event);
        });
      }
    }
  
    function handleDayCountTap() {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime;
      lastTapTime = now;
  
      if (timeSinceLastTap < doubleTapThreshold && tapTimeout) {
        clearTimeout(tapTimeout);
        tapTimeout = null;
        PoemsManager.showLaughingManOverlay();
        PoemsManager.stopPulsing();
      } else {
        tapTimeout = setTimeout(() => {
          PoemsManager.showLaughingManIcon();
          PoemsManager.stopPulsing();
          tapTimeout = null;
        }, doubleTapThreshold);
      }
    }
  
    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    }
  
    function setIsUpdating(value) {
      isUpdating = value;
    }
  
    function saveState() {
      const state = {
        preferredLanguage: currentLanguage,
        sortOrders,
        lastViewedPoemId,
        currentPoemSet,
        savedVolume,
      };
      localStorage.setItem(stateKey, JSON.stringify(state));
    }
  
    // Expose so other modules can call script.saveState(), script.getIsUpdating, etc.
    window.script = {
      saveState,
      setIsUpdating,
      getIsUpdating: () => isUpdating,
    };
  })();
  