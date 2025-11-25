'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GameDialog from '@/components/GameDialog';
import VictoryDialog from '@/components/VictoryDialog';
import styles from './tetris.module.css';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: '#00ffff' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffff00' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#ff00ff' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00ff00' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff0000' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000ff' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#ffa500' },
};

type TetrominoType = keyof typeof TETROMINOS;

interface Position {
  x: number;
  y: number;
}

const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

const randomTetromino = (): TetrominoType => {
  const types = Object.keys(TETROMINOS) as TetrominoType[];
  return types[Math.floor(Math.random() * types.length)];
};

export default function Tetris() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const minigamesMode = localStorage.getItem('minigamesMode');
      return minigamesMode !== 'true';
    }
    return true;
  });
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<TetrominoType>(randomTetromino());
  const [position, setPosition] = useState<Position>({ x: 3, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [clearedLines, setClearedLines] = useState<number[]>([]);
  const [hasWon, setHasWon] = useState(false);
  const [isHardDropping, setIsHardDropping] = useState(false);
  const [showVictory, setShowVictory] = useState(false);

  const rotate = (matrix: number[][]) => {
    const rotated = matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
    return rotated;
  };

  const getRotatedShape = (piece: TetrominoType, rot: number) => {
    let shape = TETROMINOS[piece].shape;
    for (let i = 0; i < rot % 4; i++) {
      shape = rotate(shape);
    }
    return shape;
  };

  const checkCollision = (
    testPosition: Position,
    testPiece: TetrominoType,
    testRotation: number
  ): boolean => {
    const shape = getRotatedShape(testPiece, testRotation);

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const newX = testPosition.x + x;
          const newY = testPosition.y + y;

          if (
            newX < 0 ||
            newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && board[newY][newX])
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergePiece = useCallback(() => {
    const newBoard = board.map(row => [...row]);
    const shape = getRotatedShape(currentPiece, rotation);
    const color = TETROMINOS[currentPiece].color;

    shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardY = position.y + y;
          const boardX = position.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT) {
            newBoard[boardY][boardX] = color;
          }
        }
      });
    });

    return newBoard;
  }, [board, currentPiece, rotation, position]);

  const clearLines = (boardToClear: any[][]) => {
    const linesToClear: number[] = [];

    // Find which lines are complete
    boardToClear.forEach((row, index) => {
      if (row.every(cell => cell !== 0)) {
        linesToClear.push(index);
      }
    });

    if (linesToClear.length > 0) {
      // Store the lines being cleared for animation
      setClearedLines(linesToClear);

      // Wait for animation before actually clearing
      setTimeout(() => {
        const newBoard = boardToClear.filter((_, index) => !linesToClear.includes(index));

        while (newBoard.length < BOARD_HEIGHT) {
          newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        }

        setBoard(newBoard);
        setClearedLines([]);
      }, 400); // Animation duration

      return { newBoard: boardToClear, linesCleared: linesToClear.length };
    }

    return { newBoard: boardToClear, linesCleared: 0 };
  };

  const lockPiece = useCallback(() => {
    const mergedBoard = mergePiece();
    const { newBoard, linesCleared } = clearLines(mergedBoard);

    setBoard(newBoard);
    const newScore = score + linesCleared * 100 * level;
    setScore(newScore);

    // Check if player won
    if (newScore >= 600) {
      setHasWon(true);
      setShowVictory(true);
      setGameOver(true);
      return;
    }

    if (linesCleared > 0 && score > 0 && score % 500 === 0) {
      setLevel(prev => prev + 1);
    }

    const nextPiece = randomTetromino();
    const nextPosition = { x: 3, y: 0 };

    if (checkCollision(nextPosition, nextPiece, 0)) {
      setGameOver(true);
    } else {
      setCurrentPiece(nextPiece);
      setPosition(nextPosition);
      setRotation(0);
    }
  }, [mergePiece, score, level]);

  const moveDown = useCallback(() => {
    if (gameOver || isPaused) return;

    const newPosition = { x: position.x, y: position.y + 1 };

    if (!checkCollision(newPosition, currentPiece, rotation)) {
      setPosition(newPosition);
    } else {
      lockPiece();
    }
  }, [position, currentPiece, rotation, gameOver, isPaused, lockPiece]);

  const moveHorizontal = (direction: number) => {
    if (gameOver || isPaused) return;

    const newPosition = { x: position.x + direction, y: position.y };
    if (!checkCollision(newPosition, currentPiece, rotation)) {
      setPosition(newPosition);
    }
  };

  const rotatePiece = () => {
    if (gameOver || isPaused) return;

    const newRotation = rotation + 1;
    if (!checkCollision(position, currentPiece, newRotation)) {
      setRotation(newRotation);
    }
  };

  const hardDrop = useCallback(() => {
    if (gameOver || isPaused || isHardDropping) return;

    let dropPosition = { ...position };
    while (!checkCollision({ x: dropPosition.x, y: dropPosition.y + 1 }, currentPiece, rotation)) {
      dropPosition.y++;
    }

    setIsHardDropping(true);

    // Animate the drop
    const startY = position.y;
    const endY = dropPosition.y;
    const duration = 150; // milliseconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentY = Math.floor(startY + (endY - startY) * progress);
      setPosition({ x: position.x, y: currentY });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete, lock the piece
        setIsHardDropping(false);

        // Manually merge the piece at the drop position
        const newBoard = board.map(row => [...row]);
        const shape = getRotatedShape(currentPiece, rotation);
        const color = TETROMINOS[currentPiece].color;

        shape.forEach((row, y) => {
          row.forEach((cell, x) => {
            if (cell) {
              const boardY = dropPosition.y + y;
              const boardX = dropPosition.x + x;
              if (boardY >= 0 && boardY < BOARD_HEIGHT) {
                newBoard[boardY][boardX] = color;
              }
            }
          });
        });

        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
        setBoard(clearedBoard);
        const newScore = score + linesCleared * 100 * level;
        setScore(newScore);

        // Check if player won
        if (newScore >= 600) {
          setHasWon(true);
          setShowVictory(true);
          setGameOver(true);
          return;
        }

        if (linesCleared > 0 && score > 0 && score % 500 === 0) {
          setLevel(prev => prev + 1);
        }

        const nextPiece = randomTetromino();
        const nextPosition = { x: 3, y: 0 };

        if (checkCollision(nextPosition, nextPiece, 0)) {
          setGameOver(true);
        } else {
          setCurrentPiece(nextPiece);
          setPosition(nextPosition);
          setRotation(0);
        }
      }
    };

    requestAnimationFrame(animate);
  }, [gameOver, isPaused, isHardDropping, position, currentPiece, rotation, board, score, level]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) {
        if (e.key === 'Enter') {
          setBoard(createEmptyBoard());
          setCurrentPiece(randomTetromino());
          setPosition({ x: 3, y: 0 });
          setRotation(0);
          setScore(0);
          setLevel(1);
          setGameOver(false);
          setHasWon(false);
          setShowVictory(false);
        } else if (e.key === 'Escape') {
          router.push('/');
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveHorizontal(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
        case ' ':
          e.preventDefault();
          rotatePiece();
          break;
        case 'Enter':
          e.preventDefault();
          hardDrop();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
        case 'Escape':
          router.push('/');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [moveDown, gameOver, router, isPaused]);

  useEffect(() => {
    if (gameOver || isPaused) return;

    const speed = Math.max(100, 1000 - (level - 1) * 100);
    const interval = setInterval(moveDown, speed);
    return () => clearInterval(interval);
  }, [moveDown, gameOver, isPaused, level]);

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    const shape = getRotatedShape(currentPiece, rotation);
    const color = TETROMINOS[currentPiece].color;

    shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const boardY = position.y + y;
          const boardX = position.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            displayBoard[boardY][boardX] = color;
          }
        }
      });
    });

    return displayBoard;
  };

  if (showDialog) {
    return (
      <GameDialog
        stepNumber={1}
        stepName="Step 1"
        skillName="Resolución de Problemas"
        description="El primer desafio consiste en encajar piezas, tienes que estar rapida para eso y no dejar que se te amontonen.<br />Suerte."
        imageUrl="/sigmund.png"
        imageOutside={false}
        hideHeader={true}
        alertTitle="Tetris"
        onStart={() => setShowDialog(false)}
        onBack={() => router.push('/')}
      />
    );
  }

  if (showVictory) {
    return <VictoryDialog nextGamePath="/memotest" levelNumber={0} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameWrapper}>
        <h1 className={styles.title}>TETRIS</h1>

        <div className={styles.gameArea}>
          <div className={styles.sidebar}>
            <div className={styles.scoreBox}>
              <h3>SCORE</h3>
              <p className={styles.scoreValue}>{score}</p>
            </div>
          </div>

          <div className={styles.boardContainer}>
            <div className={styles.board}>
              {renderBoard().map((row, y) => (
                <div key={y} className={styles.row}>
                  {row.map((cell, x) => (
                    <div
                      key={x}
                      className={`${styles.cell} ${clearedLines.includes(y) ? styles.lineClearing : ''}`}
                      style={{
                        backgroundColor: cell || 'transparent',
                        borderColor: cell ? cell : 'rgba(0, 255, 136, 0.2)',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {gameOver && (
              <div className={styles.gameOverOverlay}>
                <div className={styles.gameOverBox}>
                  {!hasWon && <img src="/triste.jpg" alt="sad" className={styles.sadImage} />}
                  <h2>{hasWon ? '¡FELICITACIONES!' : 'Perdiste! :('}</h2>
                  {hasWon ? (
                    <>
                      <p className={styles.finalScore}>¡Lo lograste!</p>
                      <p className={styles.instruction}>SCORE: {score}</p>
                    </>
                  ) : (
                    <p className={styles.finalScore}>SCORE: {score}</p>
                  )}
                  <p className={styles.instruction}>PRESS ENTER TO RESTART</p>
                  <p className={styles.instruction}>PRESS ESC FOR MENU</p>
                </div>
              </div>
            )}

            {isPaused && !gameOver && (
              <div className={styles.gameOverOverlay}>
                <div className={styles.gameOverBox}>
                  <h2>PAUSED</h2>
                  <p className={styles.instruction}>PRESS P TO RESUME</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <p>← → MOVE | ↑ / SPACE ROTATE | ↓ SOFT DROP | ENTER HARD DROP</p>
          <p>P PAUSE | ESC MENU</p>
        </div>
      </div>
    </div>
  );
}
