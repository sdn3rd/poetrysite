// poems.js
(() => {
    // We'll track local states as in original
    let currentLanguage = 'en';
    let currentPoemSet = 'main';
    let currentPoems = [];
    let sortOrders = {};
    let savedVolume = 0.3;
    let lastViewedPoemId = null;
    let isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
    let isShowingImage = false; // used for Laughing Man icon

    // Also track audio
    let currentAudio = null;
    let currentPlayingPoem = null;

    // We'll store which poem is expanded and possibly has a custom background
    // so that script.js can reference it if needed
    let currentExpandedPoem = null;

    // Some references originally in your code
    const startDate = new Date('2024-10-24');

    // The same objects from original:
    const audioDirectories = {
      main: '/audio/',
      strands: '/audio/strands/',
    };

    const customBackgrounds = {
      '15 November 2024': {
        light: 'images/skipping_alt.jpg',
        dark: 'images/skipping.jpg',
      },
      '1 December 2024': {
        light: 'images/wallet_alt.jpg',
        dark: 'images/wallet.jpg',
      },
      '3 December 2024': {
        light: 'images/sewing_alt.jpg',
        dark: 'images/sewing.jpg',
      },
      '5 December 2024': {
        light: 'images/amnesia_alt.jpg',
        dark: 'images/amnesia.jpg',
      },
    };

    // For puzzle insertion
    function insertPuzzlePoem() {
      const puzzlePoem = {
        title_en: '15 Puzzle',
        title_it: 'Gioco del 15',
        date_en: '14 December 2024',
        date_it: '14 Dicembre 2024',
        poem_en: 'YOUMAKEMEWEAK ',
        poem_it: 'TIINDEBOLISCO ',
        puzzle_content: true,
      };
      currentPoems.unshift(puzzlePoem);
    }

    function isPuzzlePoemInserted() {
      return currentPoems.some((poem) => poem.date_en === '14 December 2024' && poem.puzzle_content);
    }

    // ============ ID generation, just like original =============
    function generatePoemId(poem) {
      if (poem.date_en) {
        return (
          'poem-' +
          poem.date_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
        );
      } else if (poem.title_en) {
        return (
          'poem-' +
          poem.title_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
        );
      } else if (poem.poem_en) {
        const poemContent = Array.isArray(poem.poem_en) ? poem.poem_en.join(' ') : poem.poem_en;
        const snippet = poemContent
          .slice(0, 10)
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_-]/g, '');
        return 'poem-' + snippet;
      } else {
        return 'poem-unknown';
      }
    }

    function getPoemById(poemId) {
      return currentPoems.find((poem) => generatePoemId(poem) === poemId);
    }

    // ============ LoadPoems logic (partial mimic) ============
    async function loadPoemsFromSet(jsonFile) {
      try {
        const data = await window.CacheManager.getCachedData(jsonFile);
        if (data) {
          currentPoems = data;
          if (jsonFile === 'experiments.json' && !isPuzzlePoemInserted()) {
            insertPuzzlePoem();
          }
          await displayPoems(currentPoems, jsonFile);
        } else {
          const url = `json/${jsonFile}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            currentPoems = data;
            if (jsonFile === 'experiments.json' && !isPuzzlePoemInserted()) {
              insertPuzzlePoem();
            }
            await window.CacheManager.storeCachedData(jsonFile, data);
            await displayPoems(data, jsonFile);
          } else {
            console.error(`Failed to fetch ${url}: ${response.status}`);
          }
        }
      } catch (error) {
        console.error('Error loading poems:', error);
      }

      // If experiments.json, also call puzzle logic if needed
      if (jsonFile === 'experiments.json') {
        // Your puzzle or slidingPuzzle.initialize() here if needed...
      }
    }

    // ============ parseDateString =============
    function parseDateString(dateStr) {
      if (!dateStr) return null;
      const [dayStr, monthStr, yearStr] = dateStr.split(' ');
      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);

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
      const monthsIt = [
        'Gennaio',
        'Febbraio',
        'Marzo',
        'Aprile',
        'Maggio',
        'Giugno',
        'Luglio',
        'Agosto',
        'Settembre',
        'Ottobre',
        'Novembre',
        'Dicembre',
      ];
      let monthIndex = monthsEn.indexOf(monthStr);
      if (monthIndex === -1) {
        monthIndex = monthsIt.indexOf(monthStr);
      }
      if (monthIndex === -1) {
        console.warn('Invalid month in date:', dateStr);
        return null;
      }
      return new Date(year, monthIndex, day);
    }

    function filterPoemsByDate(data, lastCacheDate) {
      if (!lastCacheDate) return data;
      return data.filter((poem) => {
        if (poem.date_en) {
          const poemDate = parseDateString(poem.date_en);
          return poemDate ? poemDate <= lastCacheDate : true;
        }
        return true;
      });
    }

    // ============ Display poems as in your original code =============
    async function displayPoems(poems, jsonFile) {
      const container = document.getElementById('poems-container');
      if (!container) {
        console.error('No element with ID "poems-container" found.');
        return;
      }
      container.innerHTML = '';

      // Sort
      const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
      poems = poems.filter((p) => p.poem_en || p.poem_it);
      const lastCacheDate = await window.CacheManager.getLastCacheDate();

      if (jsonFile === 'poetry.json') {
        poems = filterPoemsByDate(poems, lastCacheDate);
        poems.sort((a, b) => {
          if (a.date_en && b.date_en) {
            const dateA = parseDateString(a.date_en);
            const dateB = parseDateString(b.date_en);
            return currentSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          }
          return 0;
        });
      } else {
        if (currentSortOrder === 'desc') {
          poems = poems.slice().reverse();
        }
      }

      for (const poem of poems) {
        const poemId = generatePoemId(poem);

        const poemWrapper = document.createElement('div');
        poemWrapper.classList.add('poem-wrapper');
        poemWrapper.setAttribute('id', poemId);

        if (poem.matrix_poem) {
          poemWrapper.classList.add('matrix-poem-wrapper');
        }

        const content = document.createElement('div');
        content.classList.add('poem-content');

        let header = null;
        if (poem.title_en || poem.title_it) {
          header = document.createElement('div');
          header.classList.add('poem-header');

          const title = document.createElement('h2');
          title.innerText = currentLanguage === 'en' ? poem.title_en : poem.title_it;
          header.appendChild(title);
          poemWrapper.appendChild(header);

          content.style.display = 'none';

          header.addEventListener('click', async (event) => {
            // if user clicked audio controls, do nothing
            if (
              event.target.closest('.play-pause-button') ||
              event.target.closest('.volume-slider')
            ) {
              return;
            }

            collapseAllPoemsExcept(poemId);

            if (content.style.display === 'none' || content.style.display === '') {
              content.style.display = 'block';
              applyCustomBackground(poem, poemWrapper);
              removeMediaControls(poemWrapper);

              if (audioDirectories.hasOwnProperty(currentPoemSet)) {
                const result = await createAudioControls(poemWrapper, poem, header);
                if (!result) {
                  removeMediaControls(poemWrapper);
                }
              } else {
                removeMediaControls(poemWrapper);
              }
              scrollToHeader(header);

              // If puzzle poem
              if (jsonFile === 'experiments.json' && poem.puzzle_content) {
                window.PuzzleManager.initializePuzzleGame(poem, poemWrapper, currentLanguage);
              }
            } else {
              content.style.display = 'none';
              removeCustomBackground(poemWrapper);
              removeMediaControls(poemWrapper);
              unhighlightPoem(poemWrapper);
            }
          });
        } else {
          content.style.display = 'block';
        }

        // poem text area
        const poemText = document.createElement('div');
        poemText.classList.add('poem-text');

        if (poem.matrix_poem) {
          // matrix as table
          const table = document.createElement('table');
          const lines = Array.isArray(poem.poem_en) ? poem.poem_en : [poem.poem_en];
          lines.forEach((line) => {
            const tr = document.createElement('tr');
            for (let char of line) {
              const td = document.createElement('td');
              td.textContent = char === ' ' ? '\u00A0' : char;
              tr.appendChild(td);
            }
            table.appendChild(tr);
          });
          poemText.appendChild(table);
        } else {
          if (!poem.puzzle_content) {
            const poemContent = currentLanguage === 'en' ? poem.poem_en : poem.poem_it;
            poemText.innerHTML = poemContent.replace(/\n/g, '<br>');
          } else {
            // puzzle content is inserted later
            poemText.innerHTML = '';
          }
        }

        content.appendChild(poemText);
        poemWrapper.appendChild(content);
        container.appendChild(poemWrapper);

        // For mobile reading mode
        if (isMobileDevice && !poem.matrix_poem && !poem.puzzle_content) {
          poemText.addEventListener('click', () => {
            enterReadingMode(poem, poemWrapper);
          });
        }
      }

      centerContent();
    }

    function centerContent() {
      const container = document.getElementById('poems-container');
      if (container) {
        container.style.maxWidth = '1024px';
        container.style.margin = '0 auto';
      }
    }

    // ============ Audio creation logic =============
    function getIcon(type) {
      const theme = document.documentElement.getAttribute('data-theme');
      return theme === 'light' ? `icons/${type}_alt.png` : `icons/${type}.png`;
    }

    function getAudioFileName(poem) {
      if (!audioDirectories[currentPoemSet]) return null;
      const dir = audioDirectories[currentPoemSet];

      if (currentPoemSet === 'main' && poem.date_en) {
        const fileName = poem.date_en.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        return `${dir}${fileName}.m4a`;
      }
      if (poem.title_en) {
        const titleFileName = poem.title_en
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_-]/g, '');
        return `${dir}${titleFileName}.m4a`;
      }
      if (poem.date_en) {
        const fallbackDateFileName = poem.date_en
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_-]/g, '');
        return `${dir}${fallbackDateFileName}.m4a`;
      }
      return null;
    }

    async function createAudioControls(poemWrapper, poem, header) {
      removeMediaControls(poemWrapper);
      const audioFile = getAudioFileName(poem);
      if (!audioFile) return null;

      const audioElement = document.createElement('audio');
      audioElement.classList.add('audio-element');
      audioElement.volume = savedVolume;
      audioElement.src = audioFile;
      audioElement.preload = 'metadata';
      audioElement.loop = true;

      const controlsContainer = document.createElement('div');
      controlsContainer.classList.add('media-controls');

      const playPauseButton = document.createElement('button');
      playPauseButton.classList.add('play-pause-button');
      playPauseButton.innerHTML = `<img src="${getIcon('play')}" alt="Play">`;

      const volumeSlider = document.createElement('input');
      volumeSlider.type = 'range';
      volumeSlider.min = '0';
      volumeSlider.max = '1';
      volumeSlider.step = '0.01';
      volumeSlider.value = savedVolume;
      volumeSlider.classList.add('volume-slider');

      controlsContainer.appendChild(playPauseButton);
      controlsContainer.appendChild(volumeSlider);

      playPauseButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (audioElement.paused) {
          if (currentAudio && currentAudio !== audioElement) {
            currentAudio.pause();
            updatePlayPauseButton(currentPlayingPoem, false);
          }
          audioElement
            .play()
            .catch((err) => console.error('Error playing audio: ', err));
          playPauseButton.innerHTML = `<img src="${getIcon('pause')}" alt="Pause">`;
          highlightPoem(poemWrapper);
          currentPlayingPoem = poem;
          currentAudio = audioElement;
        } else {
          audioElement.pause();
          playPauseButton.innerHTML = `<img src="${getIcon('play')}" alt="Play">`;
          unhighlightPoem(poemWrapper);
          currentPlayingPoem = null;
          currentAudio = null;
        }
      });

      volumeSlider.addEventListener('input', (event) => {
        event.stopPropagation();
        audioElement.volume = volumeSlider.value;
        savedVolume = parseFloat(volumeSlider.value);
        window.script.saveState(); // to persist volume
      });

      audioElement.addEventListener('ended', () => {
        playPauseButton.innerHTML = `<img src="${getIcon('play')}" alt="Play">`;
        unhighlightPoem(poemWrapper);
        currentPlayingPoem = null;
        currentAudio = null;
      });

      audioElement.addEventListener('play', () => {
        if (currentAudio && currentAudio !== audioElement) {
          currentAudio.pause();
          updatePlayPauseButton(currentPlayingPoem, false);
        }
        currentAudio = audioElement;
        currentPlayingPoem = poem;
      });

      if (header) {
        header.parentNode.insertBefore(controlsContainer, header.nextSibling);
      } else {
        poemWrapper.appendChild(controlsContainer);
      }
      return { audioElement, controlsContainer };
    }

    function updatePlayPauseButton(poem, isPlaying) {
      if (!poem) return;
      const poemId = generatePoemId(poem);
      const poemWrapper = document.getElementById(poemId);
      if (!poemWrapper) return;
      const playPauseButton = poemWrapper.querySelector('.play-pause-button');
      if (playPauseButton) {
        const iconType = isPlaying ? 'pause' : 'play';
        playPauseButton.innerHTML = `<img src="${getIcon(iconType)}" alt="${
          isPlaying ? 'Pause' : 'Play'
        }">`;
      }
    }

    function removeMediaControls(poemWrapper) {
      if (!poemWrapper) return;
      const audioElement = poemWrapper.querySelector('.audio-element');
      const controlsContainer = poemWrapper.querySelector('.media-controls');
      if (audioElement) {
        audioElement.pause();
        audioElement.remove();
      }
      if (controlsContainer) controlsContainer.remove();

      if (currentAudio === audioElement) {
        currentAudio = null;
        currentPlayingPoem = null;
      }
    }

    // ============ Poem expand/collapse =============
    function collapseAllPoems() {
      const contents = document.querySelectorAll('.poem-content');
      contents.forEach((content) => {
        const poemWrapper = content.parentElement;
        if (!poemWrapper) return;
        if (poemWrapper.querySelector('.poem-header')) {
          content.style.display = 'none';
          removeCustomBackground(poemWrapper);
          removeMediaControls(poemWrapper);
          unhighlightPoem(poemWrapper);
        }
      });
      if (currentAudio) {
        currentAudio.pause();
        updatePlayPauseButton(currentPlayingPoem, false);
        currentAudio = null;
        currentPlayingPoem = null;
      }
    }

    function collapseAllPoemsExcept(exceptPoemId) {
      const contents = document.querySelectorAll('.poem-content');
      contents.forEach((content) => {
        const poemWrapper = content.parentElement;
        if (!poemWrapper) return;
        if (poemWrapper.id !== exceptPoemId && poemWrapper.querySelector('.poem-header')) {
          content.style.display = 'none';
          removeCustomBackground(poemWrapper);
          removeMediaControls(poemWrapper);
          unhighlightPoem(poemWrapper);
        }
      });
      if (currentAudio && currentPlayingPoem) {
        if (generatePoemId(currentPlayingPoem) !== exceptPoemId) {
          currentAudio.pause();
          updatePlayPauseButton(currentPlayingPoem, false);
          currentAudio = null;
          currentPlayingPoem = null;
        }
      }
    }

    // ============ Theme-based backgrounds ============
    function applyCustomBackground(poem, poemWrapper) {
      if (poem.date_en && customBackgrounds[poem.date_en]) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const bgUrl =
          customBackgrounds[poem.date_en][currentTheme] ||
          customBackgrounds[poem.date_en].dark;
        poemWrapper.classList.add('custom-background');
        poemWrapper.style.backgroundImage = `url('${bgUrl}')`;
        currentExpandedPoem = { poem, wrapper: poemWrapper };
      } else {
        removeCustomBackground(poemWrapper);
      }
    }

    function removeCustomBackground(poemWrapper) {
      if (!poemWrapper) return;
      poemWrapper.classList.remove('custom-background');
      poemWrapper.style.backgroundImage = '';
      currentExpandedPoem = null;
    }

    // ============ Highlighting =============
    function highlightPoem(poemWrapper) {
      poemWrapper.classList.add('highlight');
    }
    function unhighlightPoem(poemWrapper) {
      poemWrapper.classList.remove('highlight');
    }

    // ============ Scrolling ============
    function scrollToHeader(headerElement) {
      const fixedHeader = document.getElementById('header');
      const fixedHeaderHeight = fixedHeader ? fixedHeader.offsetHeight : 0;
      const rect = headerElement.getBoundingClientRect();
      const absoluteTop = rect.top + window.pageYOffset;
      const scrollTop = absoluteTop - fixedHeaderHeight;
      window.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }

    // ============ Reading mode for mobile ============
    function enterReadingMode(poem, poemWrapper) {
      if (!isMobileDevice) return;

      const overlay = document.createElement('div');
      overlay.classList.add('reading-mode-overlay');

      const readingContent = document.createElement('div');
      readingContent.classList.add('reading-mode-content-wrapper');

      const readingHeader = document.createElement('div');
      readingHeader.classList.add('reading-mode-header');
      const titleEl = document.createElement('h2');
      titleEl.innerText = currentLanguage === 'en' ? poem.title_en : poem.title_it;
      readingHeader.appendChild(titleEl);

      const readingContentText = document.createElement('div');
      readingContentText.classList.add('reading-mode-content');
      const poemContent = currentLanguage === 'en' ? poem.poem_en : poem.poem_it;
      readingContentText.innerHTML = poemContent.replace(/\n/g, '<br>');

      readingContent.appendChild(readingHeader);
      readingContent.appendChild(readingContentText);
      overlay.appendChild(readingContent);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', () => {
        exitReadingMode();
      });

      document.body.classList.add('reading-mode-active');
    }

    function exitReadingMode() {
      const overlay = document.querySelector('.reading-mode-overlay');
      if (overlay) overlay.remove();
      document.body.classList.remove('reading-mode-active');
    }

    // ============ Sort toggles =============
    function toggleSortOrder() {
      const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
      const newSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      sortOrders[currentPoemSet] = newSortOrder;
      updateSortToggleLabel();
      loadPoemsFromSet(getJsonFileForCurrentSet());
      window.script.saveState();
    }

    function updateSortToggleLabel() {
      const sortToggleBtn = document.getElementById('sort-toggle');
      if (!sortToggleBtn) return;
      const currentSortOrder = sortOrders[currentPoemSet] || 'desc';
      sortToggleBtn.innerText = currentSortOrder === 'asc' ? '↑' : '↓';
    }

    function getJsonFileForCurrentSet() {
      switch (currentPoemSet) {
        case 'lupa':
          return 'lupa.json';
        case 'caliope':
          return 'caliope.json';
        case 'experiment':
          return 'experiments.json';
        case 'strands':
          return 'strands.json';
        default:
          return 'poetry.json';
      }
    }

    // ============ Language toggling =============
    function toggleLanguage() {
      currentLanguage = currentLanguage === 'en' ? 'it' : 'en';
      localStorage.setItem('language', currentLanguage);
      setLanguage();
      window.script.saveState();
      loadPoemsFromSet(getJsonFileForCurrentSet());

      // if experiment, re-init puzzle
      if (currentPoemSet === 'experiment') {
        const puzzleWrapper = document.getElementById('poem-14_December_2024');
        if (puzzleWrapper) {
          const poem = getPoemById(puzzleWrapper.id);
          window.PuzzleManager.initializePuzzleGame(poem, puzzleWrapper, currentLanguage);
        }
      }
    }

    function setLanguage() {
      document.documentElement.setAttribute('lang', currentLanguage);
      updateContentLanguage();
    }

    function updateContentLanguage() {
      const langToggleBtn = document.getElementById('lang-toggle');
      if (langToggleBtn) {
        langToggleBtn.innerText = currentLanguage === 'en' ? 'Ita' : 'Eng';
      }

      const expandAllBtn = document.getElementById('expand-all');
      const collapseAllBtn = document.getElementById('collapse-all');
      if (expandAllBtn && collapseAllBtn) {
        expandAllBtn.innerText = currentLanguage === 'en' ? 'Expand All' : 'Espandi Tutto';
        collapseAllBtn.innerText =
          currentLanguage === 'en' ? 'Collapse All' : 'Comprimi Tutto';
      }

      updateSideMenuTexts();
      updateFooterText();
    }

    function updateSideMenuTexts() {
      const homeLinkText = document.querySelector('#home-link .menu-item-text');
      const caliopeLinkText = document.querySelector('#caliope-link .menu-item-text');
      const lupaLinkText = document.querySelector('#lupa-link .menu-item-text');
      const experimentsLinkText = document.querySelector('#experiments-link .menu-item-text');
      const strandsLinkText = document.querySelector('#strands-link .menu-item-text');
      if (homeLinkText) {
        homeLinkText.textContent = currentLanguage === 'en' ? 'Home' : 'Inizio';
      }
      if (caliopeLinkText) caliopeLinkText.textContent = 'Calliope';
      if (lupaLinkText) lupaLinkText.textContent = 'La Lupa';
      if (experimentsLinkText) {
        experimentsLinkText.textContent =
          currentLanguage === 'en' ? 'Experiments' : 'Esperimenti';
      }
      if (strandsLinkText) {
        strandsLinkText.textContent = currentLanguage === 'en' ? 'Strands' : 'Fili';
      }
    }

    function updateFooterText() {
      const footerTextElement = document.getElementById('footer-text');
      if (footerTextElement) {
        footerTextElement.innerText =
          currentLanguage === 'en'
            ? '© 2024 All Rights Reserved Spectral Tapestry'
            : '© 2024 Tutti i Diritti Riservati Spectral Tapestry';
      }
    }

    // ============ DayCount & LaughingMan =============
    function updateDayCount() {
      const dayCountElement = document.getElementById('day-count');
      if (!dayCountElement) {
        console.error('No element with ID "day-count" found.');
        return;
      }
      const today = new Date();
      const diff = today - startDate;
      const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));
      dayCountElement.innerText = `${daysDiff} ${
        currentLanguage === 'en' ? 'Days' : 'Giorni'
      }`;
    }

    let overlayHideTimer = null;
    function showLaughingManOverlay() {
      const overlay = document.getElementById('laughingman-overlay');
      if (!overlay) return;

      const overlayImg = document.getElementById('laughingman-overlay-img');
      const theme = document.documentElement.getAttribute('data-theme');
      if (overlayImg) {
        overlayImg.src = theme === 'light' ? 'icons/laughingman_alt.png' : 'icons/laughingman.png';
      }
      overlay.classList.add('visible');
      document.body.classList.add('overlay-active');

      if (overlayHideTimer) clearTimeout(overlayHideTimer);
      overlayHideTimer = setTimeout(() => {
        hideLaughingManOverlay();
      }, 30000);
    }

    function hideLaughingManOverlay() {
      const overlay = document.getElementById('laughingman-overlay');
      if (overlay) {
        overlay.classList.remove('visible');
        document.body.classList.remove('overlay-active');
      }
      if (overlayHideTimer) {
        clearTimeout(overlayHideTimer);
        overlayHideTimer = null;
      }
      if (currentAudio) {
        currentAudio.pause();
        updatePlayPauseButton(currentPlayingPoem, false);
        currentAudio = null;
        currentPlayingPoem = null;
      }
    }

    function showLaughingManIcon() {
      const dayCountElement = document.getElementById('day-count');
      if (!dayCountElement) return;

      const theme = document.documentElement.getAttribute('data-theme');
      const imgSrc = theme === 'light' ? 'icons/laughingman_alt.png' : 'icons/laughingman.png';
      dayCountElement.innerHTML = `<img src="${imgSrc}" alt="Laughing Man" class="day-count-image">`;

      removePulsing();
      isShowingImage = true;
      setTimeout(() => {
        revertDayCountToDate();
      }, 3000);
    }

    function revertDayCountToDate() {
      const dayCountElement = document.getElementById('day-count');
      if (!dayCountElement) return;
      updateDayCount();
      isShowingImage = false;
    }

    function addPulsing() {
      const dayCountElement = document.getElementById('day-count');
      if (dayCountElement) dayCountElement.classList.add('pulsating');
    }

    function removePulsing() {
      const dayCountElement = document.getElementById('day-count');
      if (dayCountElement) dayCountElement.classList.remove('pulsating');
    }

    let pulsingInterval = null;
    function startPulsing() {
      addPulsing();
      setTimeout(removePulsing, 2000);
      pulsingInterval = setInterval(() => {
        addPulsing();
        setTimeout(removePulsing, 2000);
      }, 60000);
    }

    function stopPulsing() {
      if (pulsingInterval) {
        clearInterval(pulsingInterval);
        pulsingInterval = null;
      }
      removePulsing();
    }

    function updateDayCountImage() {
      if (isShowingImage) {
        const dayCountElement = document.getElementById('day-count');
        if (dayCountElement) {
          const theme = document.documentElement.getAttribute('data-theme');
          const imgEl = dayCountElement.querySelector('.day-count-image');
          if (imgEl) {
            imgEl.src = theme === 'light' ? 'icons/laughingman_alt.png' : 'icons/laughingman.png';
          }

          const overlayImg = document.getElementById('laughingman-overlay-img');
          if (overlayImg) {
            overlayImg.src = theme === 'light' ? 'icons/laughingman_alt.png' : 'icons/laughingman.png';
          }
        }
      }
    }

    // ============ Cloud icon update for isUpdating =============
    function updateCloudIconState() {
      const cloudIcon = document.querySelector('.cloud-icon');
      if (!cloudIcon) return;

      const theme = document.documentElement.getAttribute('data-theme');
      const cloudIconImg = cloudIcon.querySelector('img');

      if (window.script.getIsUpdating && window.script.getIsUpdating()) {
        cloudIcon.classList.add('blinking');
        cloudIconImg.src = theme === 'light' ? 'icons/cloud_alt.png' : 'icons/cloud.png';
      } else {
        cloudIcon.classList.remove('blinking');
        cloudIconImg.src = theme === 'light' ? 'icons/cloud_alt.png' : 'icons/cloud.png';
      }
    }

    function closeSideMenu() {
      const sideMenu = document.getElementById('side-menu');
      const hamburgerMenu = document.getElementById('hamburger-menu');
      if (sideMenu) sideMenu.classList.remove('visible');
      if (hamburgerMenu) hamburgerMenu.classList.remove('hidden');
      const patreonIcon = document.getElementById('patreon-icon-container');
      if (patreonIcon) patreonIcon.classList.remove('hidden');

      if (currentAudio) {
        currentAudio.pause();
        updatePlayPauseButton(currentPlayingPoem, false);
        currentAudio = null;
        currentPlayingPoem = null;
      }
    }

    function switchPoemSet(setName, jsonFile) {
      currentPoemSet = setName;
      loadPoemsFromSet(jsonFile);
      closeSideMenu();
      updateSortToggleLabel();
      window.script.saveState();

      if (currentAudio) {
        currentAudio.pause();
        updatePlayPauseButton(currentPlayingPoem, false);
        currentAudio = null;
        currentPlayingPoem = null;
      }
    }

    // ============ Provide "setters" so script.js can push states here =============
    function setCurrentLanguage(lang) {
      currentLanguage = lang;
    }
    function setCurrentPoemSet(set) {
      currentPoemSet = set;
    }
    function setSortOrders(obj) {
      sortOrders = obj;
    }
    function setSavedVolume(vol) {
      savedVolume = vol;
    }
    function setLastViewedPoemId(id) {
      lastViewedPoemId = id;
    }

    function initDefaultSortOrders() {
      const sets = ['main', 'lupa', 'caliope', 'experiment', 'strands'];
      sets.forEach((s) => {
        if (!sortOrders[s]) {
          sortOrders[s] = 'desc';
        }
      });
    }

    // ============ MISSING FUNCTIONS ADDED BELOW ============

    /**
     * Called by script.js -> applyTheme(theme)
     * Updates all relevant icons for the new theme.
     */
    function updateIconsForTheme(theme) {
      // The hamburger-menu icon
      const menuIcon = document.querySelector('#hamburger-menu img');
      if (menuIcon) {
        menuIcon.src = (theme === 'light') ? 'icons/menu_alt.png' : 'icons/menu.png';
      }
      // Patreon icon
      const patreonIcon = document.getElementById('patreon-icon');
      if (patreonIcon) {
        patreonIcon.src = (theme === 'light') ? 'icons/patreon_alt.png' : 'icons/patreon.png';
      }
      // Dark mode toggle icon
      const darkModeIcon = document.querySelector('#dark-mode-toggle img');
      if (darkModeIcon) {
        darkModeIcon.src = (theme === 'light') ? 'icons/darkmode.png' : 'icons/lightmode.png';
      }
      // Cloud icon refresh
      const cloudIconImg = document.querySelector('.cloud-icon img');
      if (cloudIconImg) {
        cloudIconImg.src = (theme === 'light') ? 'icons/cloud_alt.png' : 'icons/cloud.png';
      }
      // Also update play/pause buttons to match the new theme color
      updatePlayPauseIcons();
      // Also update side menu icons
      updateSideMenuIcons(theme);
      // And if needed, day count image
      updateDayCountImage();
    }

    /**
     * Called by script.js -> PoemsManager.updateSideMenuIcons(...)
     * or within updateIconsForTheme
     * Updates the side menu icons (home, caliope, etc.) for the theme
     */
    function updateSideMenuIcons(theme) {
      const homeIcon = document.querySelector('#home-link img');
      const caliopeIcon = document.querySelector('#caliope-link img');
      const lupaIcon = document.querySelector('#lupa-link img');
      const experimentsIcon = document.querySelector('#experiments-link img');
      const strandsIcon = document.querySelector('#strands-link img');
      const tristanIcon = document.querySelector('#tristan-logo-link img');

      if (homeIcon) {
        homeIcon.src = theme === 'light' ? 'icons/home_alt.png' : 'icons/home.png';
      }
      if (caliopeIcon) {
        caliopeIcon.src = theme === 'light' ? 'icons/caliope_alt.png' : 'icons/caliope.png';
      }
      if (lupaIcon) {
        lupaIcon.src = theme === 'light' ? 'icons/lupa_alt.png' : 'icons/lupa.png';
      }
      if (experimentsIcon) {
        experimentsIcon.src = theme === 'light' ? 'icons/experiments_alt.png' : 'icons/experiments.png';
      }
      if (strandsIcon) {
        strandsIcon.src = theme === 'light' ? 'icons/strands_alt.png' : 'icons/strands.png';
      }
      if (tristanIcon) {
        tristanIcon.src = theme === 'light' ? 'images/tristanlogo_alt.png' : 'images/tristanlogo.png';
      }
    }

    /**
     * Called by script.js -> PoemsManager.updatePlayPauseIcons()
     * or from updateIconsForTheme
     * Refreshes any existing play/pause icons to the correct theme
     */
    function updatePlayPauseIcons() {
      const theme = document.documentElement.getAttribute('data-theme');
      const playButtons = document.querySelectorAll('.play-pause-button img');
      playButtons.forEach((img) => {
        if (img.alt === 'Play') {
          img.src = theme === 'light' ? 'icons/play_alt.png' : 'icons/play.png';
        } else if (img.alt === 'Pause') {
          img.src = theme === 'light' ? 'icons/pause_alt.png' : 'icons/pause.png';
        }
      });
    }

    // Expose as PoemsManager
    window.PoemsManager = {
      // Basic
      setCurrentLanguage,
      setCurrentPoemSet,
      setSortOrders,
      setSavedVolume,
      setLastViewedPoemId,
      initDefaultSortOrders,

      // Puzzle insertion
      insertPuzzlePoem,
      isPuzzlePoemInserted,

      // Poem logic
      loadPoemsFromSet,
      getPoemById,
      generatePoemId,
      collapseAllPoems,
      collapseAllPoemsExcept,
      removeMediaControls,
      removeCustomBackground,
      highlightPoem,
      unhighlightPoem,
      scrollToHeader,
      centerContent,
      applyCustomBackground,

      // Expand/collapse
      toggleSortOrder,
      updateSortToggleLabel,
      getJsonFileForCurrentSet,

      // Audio
      createAudioControls,
      updatePlayPauseButton,

      // Day count, laughing man
      updateDayCount,
      startPulsing,
      stopPulsing,
      showLaughingManOverlay,
      hideLaughingManOverlay,
      showLaughingManIcon,
      revertDayCountToDate,
      addPulsing,
      removePulsing,
      isShowingImage,
      updateDayCountImage,
      updateCloudIconState,

      // Language
      toggleLanguage,
      setLanguage,
      updateContentLanguage,
      updateSideMenuTexts,
      updateFooterText,

      // Sidemenu
      closeSideMenu,
      switchPoemSet,

      // The newly added missing ones:
      updateIconsForTheme,
      updateSideMenuIcons,
      updatePlayPauseIcons,

      // So script.js can also read the currently expanded poem if needed
      get currentExpandedPoem() {
        return currentExpandedPoem;
      },
    };
})();
