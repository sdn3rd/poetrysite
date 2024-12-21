// puzzle.js
(() => {
    let currentLanguage = 'en';
  
    // This duplicates puzzle logic from your original code
    function setLanguage(lang) {
      currentLanguage = lang;
    }
  
    function getPuzzleStateKey() {
      return `puzzleState_${currentLanguage}`;
    }
  
    function savePuzzleState(container) {
      const tiles = Array.from(container.children).map((tile) => tile.textContent);
      const puzzleState = { tiles };
      localStorage.setItem(getPuzzleStateKey(), JSON.stringify(puzzleState));
    }
  
    function loadPuzzleState(container) {
      const savedState = localStorage.getItem(getPuzzleStateKey());
      if (!savedState) return false;
  
      try {
        const puzzleState = JSON.parse(savedState);
        if (!puzzleState.tiles || puzzleState.tiles.length !== 16) return false;
        Array.from(container.children).forEach((tile, index) => {
          tile.textContent = puzzleState.tiles[index] || '';
          if (tile.textContent === '') {
            tile.classList.add('empty');
            tile.style.backgroundColor = 'var(--highlight-color)';
          } else {
            tile.classList.remove('empty');
            tile.style.backgroundColor = 'var(--background-color)';
          }
        });
  
        const emptyTiles = container.querySelectorAll('.puzzle-tile.empty');
        if (emptyTiles.length > 1) {
          emptyTiles.forEach((tile, idx) => {
            if (idx > 0) {
              tile.classList.remove('empty');
              tile.style.backgroundColor = 'var(--background-color)';
            }
          });
        }
        return true;
      } catch (error) {
        console.error('Error loading puzzle state:', error);
        return false;
      }
    }
  
    function shufflePuzzleBoard(tiles) {
      for (let i = tiles.length - 2; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i].textContent, tiles[j].textContent] = [
          tiles[j].textContent,
          tiles[i].textContent,
        ];
      }
      const emptyTile = tiles[15];
      emptyTile.textContent = '';
      emptyTile.classList.add('empty');
  
      // ensure no other empty tile
      for (let i = 0; i < 15; i++) {
        if (tiles[i].textContent === '') {
          [tiles[i].textContent, emptyTile.textContent] = [
            emptyTile.textContent,
            tiles[i].textContent,
          ];
          tiles[i].classList.remove('empty');
          emptyTile.classList.add('empty');
        }
      }
    }
  
    function handlePuzzleMove(clickedTile, emptyTile, container) {
      const clickedIndex = Array.from(container.children).indexOf(clickedTile);
      const emptyIndex = Array.from(container.children).indexOf(emptyTile);
  
      const row1 = Math.floor(clickedIndex / 4);
      const col1 = clickedIndex % 4;
      const row2 = Math.floor(emptyIndex / 4);
      const col2 = emptyIndex % 4;
      if (Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1) {
        const temp = clickedTile.textContent;
        clickedTile.textContent = '';
        emptyTile.textContent = temp;
  
        clickedTile.classList.add('empty');
        emptyTile.classList.remove('empty');
        clickedTile.style.backgroundColor = 'var(--highlight-color)';
        emptyTile.style.backgroundColor = 'var(--background-color)';
  
        // ensure only one empty tile
        const emptyTiles = container.querySelectorAll('.puzzle-tile.empty');
        if (emptyTiles.length > 1) {
          emptyTiles.forEach((tile, idx) => {
            if (idx > 0) {
              tile.classList.remove('empty');
              tile.style.backgroundColor = 'var(--background-color)';
            }
          });
        }
      }
    }
  
    function createPuzzleBoard() {
      const gameContainer = document.createElement('div');
      gameContainer.classList.add('puzzle-game');
      return gameContainer;
    }
  
    function createPuzzleTiles(container, text) {
      const tiles = [];
      for (let i = 0; i < 15; i++) {
        const tile = document.createElement('div');
        tile.classList.add('puzzle-tile');
        tile.dataset.index = i;
        const char = text[i];
        tile.textContent = char || '';
        container.appendChild(tile);
        tiles.push(tile);
      }
      const emptyTile = document.createElement('div');
      emptyTile.classList.add('puzzle-tile', 'empty');
      emptyTile.dataset.index = 15;
      emptyTile.textContent = '';
      container.appendChild(emptyTile);
      tiles.push(emptyTile);
  
      return tiles;
    }
  
    function initializePuzzleGame(poem, wrapper, currentLanguage) {
      const content = wrapper.querySelector('.poem-content');
      if (!content) return;
  
      // remove existing puzzle if present
      const existingPuzzle = content.querySelector('.puzzle-game');
      if (existingPuzzle) existingPuzzle.remove();
  
      if (!poem || !poem.puzzle_content) return;
  
      const text = (currentLanguage === 'en' ? poem.poem_en : poem.poem_it) || '';
      const gameContainer = createPuzzleBoard();
      const tiles = createPuzzleTiles(gameContainer, text);
  
      content.insertBefore(gameContainer, content.firstChild);
  
      if (!loadPuzzleState(gameContainer)) {
        shufflePuzzleBoard(tiles);
        savePuzzleState(gameContainer);
      }
  
      gameContainer.addEventListener('click', (e) => {
        const clickedTile = e.target.closest('.puzzle-tile');
        if (!clickedTile) return;
        const emptyTile = gameContainer.querySelector('.puzzle-tile.empty');
        if (clickedTile !== emptyTile) {
          handlePuzzleMove(clickedTile, emptyTile, gameContainer);
          savePuzzleState(gameContainer);
        }
      });
    }
  
    // Expose puzzle manager
    window.PuzzleManager = {
      setLanguage,
      initializePuzzleGame,
    };
  })();
  