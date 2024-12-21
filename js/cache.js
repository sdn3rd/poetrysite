// cache.js
(() => {
    let db;
    // We keep the same stateKey and startDate as in your original code
    const stateKey = 'spectralTapestryState';
    const startDate = new Date('2024-10-24');
  
    /**
     * Initialize IndexedDB
     */
    function initDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('spectralTapestryDB', 1);
        request.onupgradeneeded = function (event) {
          db = event.target.result;
          if (!db.objectStoreNames.contains('poems')) {
            db.createObjectStore('poems', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('cacheMeta')) {
            db.createObjectStore('cacheMeta', { keyPath: 'key' });
          }
        };
        request.onsuccess = function (event) {
          db = event.target.result;
          resolve();
        };
        request.onerror = function (event) {
          console.error('IndexedDB error:', event.target.errorCode);
          reject(event.target.errorCode);
        };
      });
    }
  
    /**
     * Get data from the 'poems' store
     */
    function getCachedData(key) {
      return new Promise((resolve, reject) => {
        if (!db) {
          console.error('IndexedDB not ready.');
          reject('IndexedDB not ready.');
          return;
        }
        const transaction = db.transaction(['poems'], 'readonly');
        const store = transaction.objectStore('poems');
        const request = store.get(key);
        request.onsuccess = (event) => {
          resolve(event.target.result ? event.target.result.data : null);
        };
        request.onerror = (event) => {
          reject(event.target.errorCode);
        };
      });
    }
  
    /**
     * Store data in the 'poems' store
     */
    function storeCachedData(key, data) {
      return new Promise((resolve, reject) => {
        if (!db) {
          console.error('IndexedDB not ready.');
          reject('IndexedDB not ready.');
          return;
        }
        const transaction = db.transaction(['poems'], 'readwrite');
        const store = transaction.objectStore('poems');
        const request = store.put({ key: key, data: data });
        request.onsuccess = function () {
          resolve();
        };
        request.onerror = function (event) {
          reject(event.target.errorCode);
        };
      });
    }
  
    /**
     * Clear the entire cache (IndexedDB + localStorage + SW caches)
     */
    async function clearCache() {
      if (!db) {
        console.error('IndexedDB not initialized.');
        return;
      }
      try {
        // Clear IndexedDB stores
        const transaction = db.transaction(['poems', 'cacheMeta'], 'readwrite');
        const poemsStore = transaction.objectStore('poems');
        const metaStore = transaction.objectStore('cacheMeta');
        poemsStore.clear();
        metaStore.clear();
  
        await new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = (event) => reject(event.target.errorCode);
        });
  
        // Clear LocalStorage except for stateKey
        for (let key in localStorage) {
          if (key !== stateKey) {
            localStorage.removeItem(key);
          }
        }
  
        // Notify ServiceWorker to clear caches
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            if (event.data && event.data.action === 'cachesCleared') {
              console.log('[Main Script] SW caches cleared. Reloading...');
              window.location.reload();
            }
          };
  
          navigator.serviceWorker.controller.postMessage({ action: 'clearCaches' }, [
            messageChannel.port2,
          ]);
        } else {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  
    /**
     * Retrieve last cache date from 'cacheMeta' store
     */
    function getLastCacheDate() {
      return new Promise((resolve, reject) => {
        if (!db) {
          console.error('IndexedDB not ready.');
          reject('IndexedDB not ready.');
          return;
        }
        const transaction = db.transaction(['cacheMeta'], 'readonly');
        const store = transaction.objectStore('cacheMeta');
        const request = store.get('lastCacheDate');
        request.onsuccess = (event) => {
          const result = event.target.result;
          resolve(result ? new Date(result.data) : null);
        };
        request.onerror = (event) => {
          reject(event.target.errorCode);
        };
      });
    }
  
    /**
     * Set last cache date in 'cacheMeta' store
     */
    function setLastCacheDate(date) {
      return new Promise((resolve, reject) => {
        if (!db) {
          console.error('IndexedDB not ready.');
          reject('IndexedDB not ready.');
          return;
        }
        const transaction = db.transaction(['cacheMeta'], 'readwrite');
        const store = transaction.objectStore('cacheMeta');
        const request = store.put({
          key: 'lastCacheDate',
          data: date.toISOString(),
        });
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.errorCode);
      });
    }
  
    /**
     * Show a refresh popup if new content is available
     */
    function showRefreshPopup(currentLanguage) {
      return new Promise((resolve) => {
        const popup = document.createElement('div');
        popup.classList.add('refresh-popup');
  
        const message = document.createElement('p');
        message.innerText =
          currentLanguage === 'en'
            ? 'New content available, would you like to refresh?'
            : 'Nuovi contenuti disponibili, vuoi aggiornare?';
  
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons-container');
  
        const yesButton = document.createElement('button');
        yesButton.innerText = currentLanguage === 'en' ? 'Yes' : 'Sì';
  
        const noButton = document.createElement('button');
        noButton.innerText = currentLanguage === 'en' ? 'No' : 'No';
  
        buttonsContainer.appendChild(yesButton);
        buttonsContainer.appendChild(noButton);
  
        popup.appendChild(message);
        popup.appendChild(buttonsContainer);
  
        document.body.appendChild(popup);
  
        setTimeout(() => {
          popup.classList.add('visible');
        }, 100);
  
        yesButton.addEventListener('click', () => {
          popup.classList.remove('visible');
          setTimeout(() => {
            popup.remove();
          }, 500);
          resolve(true);
        });
  
        noButton.addEventListener('click', () => {
          popup.classList.remove('visible');
          setTimeout(() => {
            popup.remove();
          }, 500);
          resolve(false);
        });
      });
    }
  
    /**
     * Show a reset-cache popup
     */
    function showResetCachePopup(currentLanguage) {
      return new Promise((resolve) => {
        const popup = document.createElement('div');
        popup.classList.add('refresh-popup');
  
        const message = document.createElement('p');
        message.innerText =
          currentLanguage === 'en'
            ? 'This will reset the entire cache, are you sure?'
            : "Questo ripristinerà l'intera cache, sei sicuro?";
  
        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('buttons-container');
  
        const yesButton = document.createElement('button');
        yesButton.innerText = currentLanguage === 'en' ? 'Yes' : 'Sì';
  
        const noButton = document.createElement('button');
        noButton.innerText = currentLanguage === 'en' ? 'No' : 'No';
  
        buttonsContainer.appendChild(yesButton);
        buttonsContainer.appendChild(noButton);
  
        popup.appendChild(message);
        popup.appendChild(buttonsContainer);
  
        document.body.appendChild(popup);
  
        setTimeout(() => {
          popup.classList.add('visible');
        }, 100);
  
        yesButton.addEventListener('click', () => {
          popup.classList.remove('visible');
          setTimeout(() => {
            popup.remove();
          }, 500);
          resolve(true);
        });
  
        noButton.addEventListener('click', () => {
          popup.classList.remove('visible');
          setTimeout(() => {
            popup.remove();
          }, 500);
          resolve(false);
        });
      });
    }
  
    /**
     * Listen for SW messages
     */
    function handleServiceWorkerMessages(event) {
      if (event.data && event.data.action === 'cacheAudioFilesComplete') {
        console.log('[Main Script] Audio files caching complete.');
      }
      if (event.data && event.data.action === 'cachesCleared') {
        console.log('[Main Script] Caches have been cleared.');
        window.location.reload();
      }
    }
  
    /**
     * Update cache by fetching all JSON
     */
    async function updateCache(jsonFiles, setIsUpdating, updateCloudIconState, currentPoemsRef, isPuzzlePoemInserted, insertPuzzlePoem, storeCachedData, setLastCacheDate) {
      setIsUpdating(true);
      updateCloudIconState();
  
      for (const jsonFile of jsonFiles) {
        const url = `json/${jsonFile}`;
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            // We mimic your original code that sets currentPoems = data
            // so we can insert puzzlePoem if needed
            currentPoemsRef.current = data;
            if (jsonFile === 'experiments.json' && !isPuzzlePoemInserted()) {
              insertPuzzlePoem();
            }
            await storeCachedData(jsonFile, data);
          } else {
            console.error(`Failed to fetch ${url}: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
        }
      }
  
      const today = new Date();
      await setLastCacheDate(today);
      setIsUpdating(false);
      updateCloudIconState();
    }
  
    /**
     * Check & refresh the cache if older than today
     */
    async function checkAndRefreshCache(
      getLastCacheDate,
      updateCacheFunc,
      currentLanguage
    ) {
      try {
        let lastCacheDate = await getLastCacheDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
  
        if (!lastCacheDate) {
          // no cache yet
          await updateCacheFunc(false);
        } else {
          lastCacheDate.setHours(0, 0, 0, 0);
          if (lastCacheDate < today) {
            // Prompt user
            const userConfirmed = await showRefreshPopup(currentLanguage);
            if (userConfirmed) {
              await updateCacheFunc(false);
            } else {
              console.log('User chose not to refresh cache.');
            }
          }
        }
      } catch (error) {
        console.error('Error in checkAndRefreshCache:', error);
      }
    }
  
    /**
     * Generate audio files up to a certain date
     */
    function generateAudioFileList(startDate, endDate) {
      const files = [];
      const monthsEn = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      let date = new Date(startDate);
      while (date <= endDate) {
        const day = date.getDate();
        const monthName = monthsEn[date.getMonth()];
        const year = date.getFullYear();
        const fileName = `${day}_${monthName}_${year}.m4a`;
        files.push(`/audio/${fileName}`);
        date.setDate(date.getDate() + 1);
      }
      return files;
    }
  
    /**
     * Cache audio files up to lastCacheDate
     */
    async function cacheAudioFilesUpToLastCacheDate(getLastCacheDate) {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        console.warn('Service Worker is not active.');
        return;
      }
  
      try {
        const lastCacheDate = await getLastCacheDate();
        if (!lastCacheDate) {
          console.warn('No last cache date found.');
          return;
        }
        const audioFiles = generateAudioFileList(startDate, lastCacheDate);
        navigator.serviceWorker.controller.postMessage({
          action: 'cacheAudioFiles',
          files: audioFiles,
        });
      } catch (error) {
        console.error('Error caching audio files:', error);
      }
    }
  
    // Attach to window as CacheManager
    window.CacheManager = {
      initDB,
      getCachedData,
      storeCachedData,
      clearCache,
      getLastCacheDate,
      setLastCacheDate,
      showRefreshPopup,
      showResetCachePopup,
      handleServiceWorkerMessages,
      updateCache,
      checkAndRefreshCache,
      generateAudioFileList,
      cacheAudioFilesUpToLastCacheDate,
    };
  })();
  