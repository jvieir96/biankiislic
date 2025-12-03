'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GameDialog from '@/components/GameDialog';
import VictoryDialog from '@/components/VictoryDialog';
import styles from './pacman.module.css';

const GRID_WIDTH = 19;
const GRID_HEIGHT = 15;

const WALL = 1;
const DOT = 2;
const EMPTY = 0;
const POWER_PELLET = 3;
const COFFEE = 4;
const MUSHROOM = 5;

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  id: number;
  x: number;
  y: number;
  color: string;
  direction: { x: number; y: number };
  animStep: number;
}

const createMaze = (): number[][] => {
  const maze = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,4,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,5,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,0,0,0,0,0,2,1,2,2,2,2,1],
    [0,2,1,2,2,2,2,0,0,0,0,0,2,2,2,2,1,2,0],
    [1,2,2,2,2,1,2,0,0,0,0,0,2,1,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,5,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,4,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];
  return maze;
};

export default function Pacman() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const minigamesMode = localStorage.getItem('minigamesMode');
      return minigamesMode !== 'true';
    }
    return true;
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [maze, setMaze] = useState<number[][]>(createMaze());
  const [pacman, setPacman] = useState<Position>({ x: 1, y: 1 });
  const pacmanRef = useRef<Position>({ x: 1, y: 1 });
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [direction, setDirection] = useState<Position>({ x: 0, y: 0 });
  const [nextDirection, setNextDirection] = useState<Position>({ x: 0, y: 0 });
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { id: 0, x: 9, y: 7, color: '#ff0000', direction: { x: 1, y: 0 }, animStep: 0 },
    { id: 1, x: 8, y: 7, color: '#ffb8ff', direction: { x: -1, y: 0 }, animStep: 0 },
    { id: 2, x: 10, y: 7, color: '#00ffff', direction: { x: 0, y: 1 }, animStep: 0 },
    { id: 3, x: 9, y: 8, color: '#ffa500', direction: { x: 0, y: -1 }, animStep: 0 },
  ]);
  const [ghostMoveCounters, setGhostMoveCounters] = useState<Map<number, number>>(new Map([
    [0, 0],
    [1, 3],
    [2, 7],
    [3, 5],
  ]));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(true);
  const [powerMode, setPowerMode] = useState(false);
  const [eatenGhosts, setEatenGhosts] = useState<Set<number>>(new Set());
  const [nextGhostId, setNextGhostId] = useState(4);
  const [lives, setLives] = useState(4);
  const [isRespawning, setIsRespawning] = useState(false);
  const [activeGhosts, setActiveGhosts] = useState<Set<number>>(new Set());

  // Update pacmanRef whenever pacman changes
  useEffect(() => {
    pacmanRef.current = pacman;
  }, [pacman]);

  // Initialize audio on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/pacman.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Control music playback based on game state
  useEffect(() => {
    if (!audioRef.current) return;

    if (!showDialog && gameStarted && !gameOver && !gameWon) {
      audioRef.current.play().catch(error => {
        console.log('Audio playback failed:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [showDialog, gameStarted, gameOver, gameWon]);

  // Play lose sound when game over (not won)
  useEffect(() => {
    if (gameOver && !gameWon) {
      if (typeof window !== 'undefined') {
        loseSoundRef.current = new Audio('/lose.mp3');
        loseSoundRef.current.volume = 0.5;
        loseSoundRef.current.play().catch(error => {
          console.log('Lose sound playback failed:', error);
        });
      }
    }

    return () => {
      if (loseSoundRef.current) {
        loseSoundRef.current.pause();
        loseSoundRef.current.currentTime = 0;
      }
    };
  }, [gameOver, gameWon]);

  // Progressive ghost activation when game starts
  useEffect(() => {
    if (!gameStarted || gameOver || gameWon) {
      setActiveGhosts(new Set());
      return;
    }

    // Activate ghosts progressively
    const timers: NodeJS.Timeout[] = [];

    ghosts.forEach((ghost, index) => {
      const delay = index * 2500; // 2.5 seconds between each ghost
      const timer = setTimeout(() => {
        setActiveGhosts(prev => new Set(prev).add(ghost.id));
      }, delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [gameStarted, gameOver, gameWon, ghosts.length]);

  const isWall = (x: number, y: number): boolean => {
    if (y < 0 || y >= maze.length || x < 0 || x >= maze[0].length) return true;
    return maze[y][x] === WALL;
  };

  const movePacman = useCallback(() => {
    if (gameOver || gameWon || !gameStarted) return;

    let newDirection = direction;

    // Try to change direction if a new direction is queued
    if (nextDirection.x !== 0 || nextDirection.y !== 0) {
      let nextX = pacman.x + nextDirection.x;
      const nextY = pacman.y + nextDirection.y;

      // Handle wrap-around
      if (nextX < 0) nextX = GRID_WIDTH - 1;
      if (nextX >= GRID_WIDTH) nextX = 0;

      if (!isWall(nextX, nextY)) {
        newDirection = nextDirection;
        setDirection(nextDirection);
      }
    }

    let newX = pacman.x + newDirection.x;
    let newY = pacman.y + newDirection.y;

    // Handle wrap-around for horizontal movement
    if (newX < 0) newX = GRID_WIDTH - 1;
    if (newX >= GRID_WIDTH) newX = 0;

    if (!isWall(newX, newY)) {
      setPacman({ x: newX, y: newY });

      // Check for dots
      const cell = maze[newY][newX];
      if (cell === DOT) {
        setScore(prev => prev + 10);
        const newMaze = maze.map(row => [...row]);
        newMaze[newY][newX] = EMPTY;
        setMaze(newMaze);

        // Check if all dots are eaten
        const hasDotsLeft = newMaze.some(row => row.some(cell => cell === DOT || cell === COFFEE || cell === MUSHROOM));
        if (!hasDotsLeft) {
          setGameWon(true);
          setShowVictory(true);
        }
      } else if (cell === COFFEE) {
        setScore(prev => prev + 50);
        setPowerMode(true);
        const newMaze = maze.map(row => [...row]);
        newMaze[newY][newX] = EMPTY;
        setMaze(newMaze);

        setTimeout(() => setPowerMode(false), 5000);
      } else if (cell === MUSHROOM) {
        setScore(prev => prev + 50);
        setPowerMode(true);
        const newMaze = maze.map(row => [...row]);
        newMaze[newY][newX] = EMPTY;
        setMaze(newMaze);

        setTimeout(() => setPowerMode(false), 5000);
      }
    }

    setMouthOpen(prev => !prev);
  }, [pacman, direction, nextDirection, maze, gameOver, gameWon, gameStarted]);

  const moveGhosts = useCallback(() => {
    if (gameOver || gameWon || !gameStarted) return;

    setGhosts(prevGhosts => {
      return prevGhosts.map((ghost) => {
        // Only move if ghost is active
        if (!activeGhosts.has(ghost.id)) {
          return ghost; // Don't move inactive ghosts
        }

        const directions = [
          { x: 0, y: -1 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
        ];

        // Filter valid directions (exclude going backwards unless necessary)
        const validDirections = directions.filter(dir => {
          let newX = ghost.x + dir.x;
          const newY = ghost.y + dir.y;

          // Handle wrap-around
          if (newX < 0) newX = GRID_WIDTH - 1;
          if (newX >= GRID_WIDTH) newX = 0;

          return !isWall(newX, newY);
        });

        // Separate directions into forward and backward
        const forwardDirections = validDirections.filter(dir =>
          !(dir.x === -ghost.direction.x && dir.y === -ghost.direction.y)
        );

        // Use forward directions if available, otherwise use any valid direction
        const availableDirections = forwardDirections.length > 0 ? forwardDirections : validDirections;

        if (availableDirections.length === 0) {
          return ghost; // Can't move
        }

        // Calculate distance to pacman
        const distanceToPacman = Math.abs(ghost.x - pacmanRef.current.x) + Math.abs(ghost.y - pacmanRef.current.y);

        let bestDirection = ghost.direction;

        // Each ghost has unique behavior based on ID
        const ghostType = ghost.id % 4; // Cycle through 4 behavior types
        if (ghostType === 0) {
          // Ghost 0 (red): Aggressive chaser - always follows pacman directly
          if (distanceToPacman < 10) {
            let bestDistance = Infinity;
            availableDirections.forEach(dir => {
              let newX = ghost.x + dir.x;
              const newY = ghost.y + dir.y;

              // Handle wrap-around
              if (newX < 0) newX = GRID_WIDTH - 1;
              if (newX >= GRID_WIDTH) newX = 0;

              const distance = Math.abs(newX - pacmanRef.current.x) + Math.abs(newY - pacmanRef.current.y);
              if (distance < bestDistance) {
                bestDistance = distance;
                bestDirection = dir;
              }
            });
          } else {
            // Random when far
            bestDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
          }
        } else if (ghostType === 1) {
          // Ghost 1 (pink): Prefers horizontal movement
          const horizontalDirs = availableDirections.filter(d => d.x !== 0);
          if (horizontalDirs.length > 0 && Math.random() < 0.6) {
            bestDirection = horizontalDirs[Math.floor(Math.random() * horizontalDirs.length)];
          } else if (availableDirections.some(d => d.x === ghost.direction.x && d.y === ghost.direction.y)) {
            bestDirection = ghost.direction; // Continue straight
          } else {
            bestDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
          }
        } else if (ghostType === 2) {
          // Ghost 2 (cyan): Prefers vertical movement
          const verticalDirs = availableDirections.filter(d => d.y !== 0);
          if (verticalDirs.length > 0 && Math.random() < 0.6) {
            bestDirection = verticalDirs[Math.floor(Math.random() * verticalDirs.length)];
          } else if (availableDirections.some(d => d.x === ghost.direction.x && d.y === ghost.direction.y)) {
            bestDirection = ghost.direction; // Continue straight
          } else {
            bestDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
          }
        } else {
          // Ghost 3 (orange): Wanders randomly, mostly goes straight
          if (Math.random() < 0.8 && availableDirections.some(d => d.x === ghost.direction.x && d.y === ghost.direction.y)) {
            bestDirection = ghost.direction; // 80% continue straight
          } else {
            bestDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
          }
        }

        // Move exactly ONE cell in the chosen direction
        let newX = ghost.x + bestDirection.x;
        let newY = ghost.y + bestDirection.y;

        // Handle wrap-around for horizontal movement
        if (newX < 0) newX = GRID_WIDTH - 1;
        if (newX >= GRID_WIDTH) newX = 0;

        // Double check: only move if it's exactly one cell (or wrap-around)
        const deltaX = Math.abs(newX - ghost.x);
        const deltaY = Math.abs(newY - ghost.y);

        // Allow normal moves (1 cell) or wrap-around (GRID_WIDTH - 1 cells)
        const isValidMove =
          (deltaX === 1 && deltaY === 0) ||
          (deltaX === 0 && deltaY === 1) ||
          (deltaX === 0 && deltaY === 0) ||
          (deltaX === GRID_WIDTH - 1 && deltaY === 0); // wrap-around case

        if (isValidMove) {
          return {
            ...ghost,
            x: newX,
            y: newY,
            direction: bestDirection,
            animStep: ghost.animStep === 0 ? 1 : 0, // Toggle between 0 and 1
          };
        }

        // If somehow trying to move more than one cell, don't move
        return ghost;
      });
    });
  }, [gameOver, gameWon, gameStarted, activeGhosts]);

  // Check collision with ghosts
  useEffect(() => {
    if (gameOver || gameWon || isRespawning) return;

    // Check all ghosts for collisions
    for (const ghost of ghosts) {
      // Skip already eaten ghosts or inactive ghosts
      if (eatenGhosts.has(ghost.id) || !activeGhosts.has(ghost.id)) {
        continue;
      }

      // Check if pacman and ghost are in the same position
      if (ghost.x === pacman.x && ghost.y === pacman.y) {
        if (powerMode) {
          // Eat ghost - add to eaten list for animation
          setScore(prev => prev + 200);
          setEatenGhosts(prev => new Set(prev).add(ghost.id));

          // Store the ghost ID to remove
          const ghostIdToRemove = ghost.id;

          // Remove ghost after animation
          setTimeout(() => {
            setGhosts(prevGhosts => prevGhosts.filter(g => g.id !== ghostIdToRemove));
            setEatenGhosts(prev => {
              const newSet = new Set(prev);
              newSet.delete(ghostIdToRemove);
              return newSet;
            });

            // Update ghost counters
            setGhostMoveCounters(prev => {
              const newCounters = new Map(prev);
              newCounters.delete(ghostIdToRemove);
              return newCounters;
            });
          }, 500);

          // Exit after eating one ghost to prevent multiple collisions at once
          return;
        } else {
          // Prevent multiple life losses
          setIsRespawning(true);

          // Lose a life
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setIsRespawning(false);
            } else {
              // Pause the game and reset positions
              setGameStarted(false);

              // Reset positions after a brief pause
              setTimeout(() => {
                // Reset pacman position
                setPacman({ x: 1, y: 1 });
                pacmanRef.current = { x: 1, y: 1 };
                setDirection({ x: 0, y: 0 });
                setNextDirection({ x: 0, y: 0 });

                // Reset ghosts to initial positions
                setGhosts([
                  { id: 0, x: 9, y: 7, color: '#ff0000', direction: { x: 1, y: 0 }, animStep: 0 },
                  { id: 1, x: 8, y: 7, color: '#ffb8ff', direction: { x: -1, y: 0 }, animStep: 0 },
                  { id: 2, x: 10, y: 7, color: '#00ffff', direction: { x: 0, y: 1 }, animStep: 0 },
                  { id: 3, x: 9, y: 8, color: '#ffa500', direction: { x: 0, y: -1 }, animStep: 0 },
                ]);

                // Reset ghost counters
                setGhostMoveCounters(new Map([
                  [0, 0],
                  [1, 3],
                  [2, 7],
                  [3, 5],
                ]));

                // Reset eaten ghosts and next ID
                setEatenGhosts(new Set());
                setNextGhostId(4);

                // Turn off power mode
                setPowerMode(false);

                // Resume game after a short delay
                setTimeout(() => {
                  setGameStarted(true);
                  setIsRespawning(false);
                }, 1000);
              }, 500);
            }
            return newLives;
          });
          return;
        }
      }
    }
  }, [pacman, ghosts, gameOver, gameWon, powerMode, eatenGhosts, isRespawning, activeGhosts]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Start game with any key
      if (!gameStarted && !gameOver && !gameWon) {
        setGameStarted(true);
        return;
      }

      if (gameOver || gameWon) {
        if (e.key === 'Enter') {
          setMaze(createMaze());
          setPacman({ x: 1, y: 1 });
          pacmanRef.current = { x: 1, y: 1 };
          setDirection({ x: 0, y: 0 });
          setNextDirection({ x: 0, y: 0 });
          setGhosts([
            { id: 0, x: 9, y: 7, color: '#ff0000', direction: { x: 1, y: 0 }, animStep: 0 },
            { id: 1, x: 8, y: 7, color: '#ffb8ff', direction: { x: -1, y: 0 }, animStep: 0 },
            { id: 2, x: 10, y: 7, color: '#00ffff', direction: { x: 0, y: 1 }, animStep: 0 },
            { id: 3, x: 9, y: 8, color: '#ffa500', direction: { x: 0, y: -1 }, animStep: 0 },
          ]);
          setGhostMoveCounters(new Map([
            [0, 0],
            [1, 3],
            [2, 7],
            [3, 5],
          ]));
          setEatenGhosts(new Set());
          setNextGhostId(4);
          setScore(0);
          setLives(4);
          setGameOver(false);
          setGameWon(false);
          setShowVictory(false);
          setPowerMode(false);
          setGameStarted(false);
          setIsRespawning(false);
          setActiveGhosts(new Set());
        } else if (e.key === 'Escape') {
          router.push('/');
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setNextDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setNextDirection({ x: 1, y: 0 });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setNextDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setNextDirection({ x: 0, y: 1 });
          break;
        case 'Escape':
          router.push('/');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver, gameWon, gameStarted, router]);

  useEffect(() => {
    const pacmanInterval = setInterval(movePacman, 180);
    return () => clearInterval(pacmanInterval);
  }, [movePacman]);

  useEffect(() => {
    const ghostInterval = setInterval(moveGhosts, 250);
    return () => clearInterval(ghostInterval);
  }, [moveGhosts]);

  // Auto-respawn system: check periodically if we need more ghosts
  useEffect(() => {
    if (gameOver || gameWon || !gameStarted) return;

    const respawnInterval = setInterval(() => {
      setGhosts(prevGhosts => {
        // Only spawn if we have less than 4 ghosts
        if (prevGhosts.length >= 4) {
          return prevGhosts;
        }

        const spawnPositions = [
          { x: 9, y: 7 },
          { x: 8, y: 7 },
          { x: 10, y: 7 },
          { x: 9, y: 8 },
        ];
        const colors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffa500'];
        const directions = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];

        const spawnIndex = prevGhosts.length % 4;

        setNextGhostId(prevId => {
          const newGhostId = prevId;

          // Add counter for the new ghost
          setGhostMoveCounters(prev => {
            const offsets = [0, 3, 7, 5];
            const newCounters = new Map(prev);
            newCounters.set(newGhostId, offsets[spawnIndex]);
            return newCounters;
          });

          return prevId + 1;
        });

        const newGhost = {
          id: nextGhostId,
          ...spawnPositions[spawnIndex],
          color: colors[spawnIndex],
          direction: directions[spawnIndex],
          animStep: 0,
        };

        return [...prevGhosts, newGhost];
      });
    }, 2000); // Check every 2 seconds

    return () => clearInterval(respawnInterval);
  }, [gameOver, gameWon, gameStarted, nextGhostId]);

  if (showDialog) {
    return (
      <GameDialog
        stepNumber={3}
        stepName="Step 3"
        skillName="Manejo Emocional"
        description="Bien, seguimos. Este desafio pone a prueba el control de tus emociones y la constipacion. Tendras que valerte del cafe y un ayudin magico para que la constipacion no te gane.<br />Buena suerte."
        imageUrl="/sigmund.png"
        imageOutside={false}
        hideHeader={true}
        alertTitle="Pac-Poop"
        onStart={() => setShowDialog(false)}
        onBack={() => router.push('/')}
      />
    );
  }

  if (showVictory) {
    return <VictoryDialog nextGamePath="/puzzle" levelNumber={2} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameWrapper}>
        <h1 className={styles.title}>PAC-POOP</h1>

        <div className={styles.gameArea}>
          <div className={styles.sidebar}>
            <div className={styles.scoreBox}>
              <h3>SCORE</h3>
              <div className={styles.scoreValue}>{score}</div>
            </div>
            <div className={styles.scoreBox}>
              <h3>LIVES</h3>
              <div className={styles.scoreValue} style={{ fontSize: '0.9rem' }}>{'❤️'.repeat(lives)}</div>
            </div>
            {powerMode && (
              <div className={styles.powerBox}>
                <h3>POWER MODE!</h3>
              </div>
            )}
          </div>

          <div className={styles.mazeContainer}>
            <div className={styles.maze}>
              {maze.map((row, y) => (
                <div key={y} className={styles.row}>
                  {row.map((cell, x) => {
                    const hasWallRight = x < maze[0].length - 1 && maze[y][x + 1] === WALL;
                    const hasWallBottom = y < maze.length - 1 && maze[y + 1][x] === WALL;
                    const hasWallLeft = x > 0 && maze[y][x - 1] === WALL;
                    const hasWallTop = y > 0 && maze[y - 1][x] === WALL;
                    const hasGhost = ghosts.some(ghost => ghost.x === x && ghost.y === y);

                    return (
                      <div key={x} className={styles.cell}>
                        {cell === WALL && (
                          <div
                            className={`${styles.wall} ${hasWallRight ? styles.wallRight : ''} ${hasWallBottom ? styles.wallBottom : ''} ${hasWallLeft ? styles.wallLeft : ''} ${hasWallTop ? styles.wallTop : ''}`}
                          />
                        )}
                        {cell === DOT && !hasGhost && <div className={styles.dot} />}
                        {cell === COFFEE && !hasGhost && <div className={styles.coffee} />}
                        {cell === MUSHROOM && !hasGhost && <div className={styles.mushroom} />}
                        {pacman.x === x && pacman.y === y && (
                          <div
                            className={`${styles.pacman} ${mouthOpen ? styles.mouthOpen : ''}`}
                            style={{
                              transform: `rotate(${
                                direction.x === 1 ? 0 : direction.x === -1 ? 180 : 0
                              }deg)`
                            }}
                          />
                        )}
                        {ghosts.map((ghost) =>
                          ghost.x === x && ghost.y === y && (
                            <div
                              key={ghost.id}
                              className={`${eatenGhosts.has(ghost.id) ? styles.eaten : ''} ${!activeGhosts.has(ghost.id) ? styles.inactive : ''}`}
                              style={{
                                fontSize: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                filter: powerMode ? 'hue-rotate(180deg) brightness(0.7)' : `drop-shadow(0 0 3px ${ghost.color})`,
                                textShadow: powerMode ? '0 0 5px blue' : `0 0 5px ${ghost.color}`
                              }}
                            >
                              💩
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {gameOver && (
              <div className={styles.gameOverOverlay}>
                <div className={styles.gameOverBox}>
                  <img src="/triste.jpg" alt="sad" className={styles.sadImage} />
                  <h2>Perdiste! :(</h2>
                  <p className={styles.finalScore}>Score: {score}</p>
                  <p className={styles.instruction}>PRESS ENTER TO RESTART</p>
                  <p className={styles.instruction}>PRESS ESC FOR MENU</p>
                </div>
              </div>
            )}


            {!gameStarted && !gameOver && !gameWon && (
              <div className={styles.startOverlay}>
                <div className={styles.startBox}>
                  <h2>LISTO?</h2>
                  <p className={styles.instruction}>PRESIONA CUALQUIER TECLA PARA COMENZAR</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <p>ARROW KEYS TO MOVE | ESC MENU</p>
        </div>
      </div>
    </div>
  );
}
