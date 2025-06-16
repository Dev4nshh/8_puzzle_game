document.addEventListener('DOMContentLoaded', () => {
  const puzzleBoard = document.getElementById('puzzle-board');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const solveBtn = document.getElementById('solve-btn');
  const speedSlider = document.getElementById('speed');
  const movesCount = document.getElementById('moves-count');
  const solutionStatus = document.getElementById('solution-status');
  const solutionSteps = document.getElementById('solution-steps');

  const GOAL_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let currentState = [...GOAL_STATE];
  let emptyTileIndex = 8;
  let moveCount = 0;
  let isSolving = false;
  
  function renderBoard() {
      const tiles = puzzleBoard.querySelectorAll('.tile');
      tiles.forEach((tile, index) => {
          const value = currentState[index];
          tile.textContent = value === 0 ? '' : value;
          tile.classList.toggle('empty', value === 0);
          
          if (value === 0) {
              emptyTileIndex = index;
          }
      });
      updateMovableTiles();
  }
  
  function updateMovableTiles() {
      const tiles = puzzleBoard.querySelectorAll('.tile');
      tiles.forEach((tile, index) => {
          tile.classList.remove('movable');
          if (isMovable(index)) {
              tile.classList.add('movable');
          }
      });
  }
  
  function isMovable(index) {
      if (index === emptyTileIndex) return false;
      
      const row = Math.floor(index / 3);
      const col = index % 3;
      const emptyRow = Math.floor(emptyTileIndex / 3);
      const emptyCol = emptyTileIndex % 3;
      
      return (row === emptyRow && Math.abs(col - emptyCol) === 1) || 
             (col === emptyCol && Math.abs(row - emptyRow) === 1);
  }
  
  function moveTile(index) {
      if (!isMovable(index) || isSolving) return;
      
      const tiles = puzzleBoard.querySelectorAll('.tile');
      const temp = currentState[index];
      currentState[index] = currentState[emptyTileIndex];
      currentState[emptyTileIndex] = temp;
      
      renderBoard();
      moveCount++;
      movesCount.textContent = moveCount;
      
      checkWin();
  }
  
  function checkWin() {
      if (JSON.stringify(currentState) === JSON.stringify(GOAL_STATE)) {
          setTimeout(() => {
              solutionStatus.textContent = 'Puzzle solved!';
              solutionSteps.textContent = `You solved it in ${moveCount} moves.`;
          }, 300);
      }
  }
  
  function shuffle() {
      if (isSolving) return;
      
      resetGame();
      const moves = 100;
      
      for (let i = 0; i < moves; i++) {
          const movableTileIndices = [];
          for (let j = 0; j < 9; j++) {
              if (isMovable(j)) {
                  movableTileIndices.push(j);
              }
          }
          
          const randomIndex = Math.floor(Math.random() * movableTileIndices.length);
          const tileToMove = movableTileIndices[randomIndex];
          
          const temp = currentState[tileToMove];
          currentState[tileToMove] = currentState[emptyTileIndex];
          currentState[emptyTileIndex] = temp;
          emptyTileIndex = tileToMove;
      }
      
      renderBoard();
  }
  
  function resetGame() {
      moveCount = 0;
      movesCount.textContent = moveCount;
      solutionStatus.textContent = '';
      solutionSteps.textContent = '';
  }
  
  puzzleBoard.addEventListener('click', (e) => {
      const tile = e.target;
      if (tile.classList.contains('tile') && !tile.classList.contains('empty')) {
          const index = parseInt(tile.dataset.index);
          moveTile(index);
      }
  });
  
  shuffleBtn.addEventListener('click', shuffle);
  
  class PuzzleNode {
      constructor(state, emptyPos, moves = [], cost = 0, heuristic = 0) {
          this.state = [...state];
          this.emptyPos = emptyPos;
          this.moves = [...moves];
          this.cost = cost;
          this.heuristic = heuristic;
          this.totalCost = this.cost + this.heuristic;
      }
      
      getKey() {
          return this.state.join(',');
      }
  }
  
  function getManhattanDistance(state) {
      let distance = 0;
      for (let i = 0; i < state.length; i++) {
          if (state[i] !== 0) {
              const currentRow = Math.floor(i / 3);
              const currentCol = i % 3;
              
              const correctPos = state[i] - 1;
              const correctRow = Math.floor(correctPos / 3);
              const correctCol = correctPos % 3;
              
              distance += Math.abs(currentRow - correctRow) + Math.abs(currentCol - correctCol);
          }
      }
      return distance;
  }
  
  function getNeighbors(node) {
      const neighbors = [];
      const directions = [
          { dx: -1, dy: 0 }, // Left
          { dx: 1, dy: 0 },  // Right
          { dx: 0, dy: -1 }, // Up
          { dx: 0, dy: 1 }   // Down
      ];
      
      const emptyRow = Math.floor(node.emptyPos / 3);
      const emptyCol = node.emptyPos % 3;
      
      for (const dir of directions) {
          const newRow = emptyRow + dir.dy;
          const newCol = emptyCol + dir.dx;
          
          if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
              const newEmptyPos = newRow * 3 + newCol;
              const newState = [...node.state];
              
              newState[node.emptyPos] = newState[newEmptyPos];
              newState[newEmptyPos] = 0;
              
              const newMoves = [...node.moves, newEmptyPos];
              const newCost = node.cost + 1;
              const newHeuristic = getManhattanDistance(newState);
              
              neighbors.push(new PuzzleNode(newState, newEmptyPos, newMoves, newCost, newHeuristic));
          }
      }
      
      return neighbors;
  }
  
  async function solvePuzzle() {
      if (isSolving) return;
      if (JSON.stringify(currentState) === JSON.stringify(GOAL_STATE)) {
          solutionStatus.textContent = 'Puzzle is already solved!';
          return;
      }
      
      isSolving = true;
      solveBtn.disabled = true;
      shuffleBtn.disabled = true;
      solutionStatus.textContent = 'Solving with A* algorithm...';
      solutionSteps.textContent = '';
      
      const startEmptyPos = currentState.indexOf(0);
      const startNode = new PuzzleNode(
          currentState,
          startEmptyPos,
          [],
          0,
          getManhattanDistance(currentState)
      );
      
      const openSet = [startNode];
      const closedSet = new Set();
      
      let solution = null;
      let nodesExplored = 0;
      
      while (openSet.length > 0 && !solution) {
          openSet.sort((a, b) => a.totalCost - b.totalCost);
          const current = openSet.shift();
          nodesExplored++;
          
          if (JSON.stringify(current.state) === JSON.stringify(GOAL_STATE)) {
              solution = current;
              break;
          }
          
          closedSet.add(current.getKey());
          
          const neighbors = getNeighbors(current);
          for (const neighbor of neighbors) {
              if (!closedSet.has(neighbor.getKey())) {
                  const existingNodeIndex = openSet.findIndex(n => n.getKey() === neighbor.getKey());
                  
                  if (existingNodeIndex === -1) {
                      openSet.push(neighbor);
                  } else if (neighbor.cost < openSet[existingNodeIndex].cost) {
                      openSet[existingNodeIndex] = neighbor;
                  }
              }
          }
          
          if (nodesExplored % 1000 === 0) {
              solutionStatus.textContent = `Solving... (Explored ${nodesExplored} states)`;
              await new Promise(resolve => setTimeout(resolve, 0));
          }
      }
      
      if (solution) {
          solutionStatus.textContent = `Solution found! ${solution.moves.length} moves required.`;
          await animateSolution(solution.moves);
      } else {
          solutionStatus.textContent = 'Could not find a solution.';
          isSolving = false;
          solveBtn.disabled = false;
          shuffleBtn.disabled = false;
      }
  }
  
  async function animateSolution(moves) {
      const speed = parseInt(speedSlider.value);
      
      for (const tileIndex of moves) {
          await new Promise(resolve => setTimeout(resolve, speed));
          
          const tiles = puzzleBoard.querySelectorAll('.tile');
          tiles[tileIndex].classList.add('solving-animation');
          
          const temp = currentState[tileIndex];
          currentState[tileIndex] = currentState[emptyTileIndex];
          currentState[emptyTileIndex] = temp;
          emptyTileIndex = tileIndex;
          
          moveCount++;
          movesCount.textContent = moveCount;
          renderBoard();
          
          setTimeout(() => {
              tiles[tileIndex].classList.remove('solving-animation');
          }, speed / 2);
      }
      
      isSolving = false;
      solveBtn.disabled = false;
      shuffleBtn.disabled = false;
      checkWin();
  }
  
  solveBtn.addEventListener('click', solvePuzzle);
  
  renderBoard();
  shuffle();
});