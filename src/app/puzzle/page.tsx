'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GameDialog from '@/components/GameDialog';
import VictoryDialog from '@/components/VictoryDialog';
import styles from './puzzle.module.css';

interface Piece {
  id: number;
  originalPosition: number;
  inPool: boolean;
  gridPosition: number | null;
}

const GRID_SIZE = 4;
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
const PUZZLE_IMAGES = ['/parque.jpg', '/cumple.jpg', '/valeria.jpg', '/losgigantes.jpg'];

const createInitialPuzzle = (): Piece[] => {
  return Array.from({ length: TOTAL_PIECES }, (_, i) => ({
    id: i,
    originalPosition: i,
    inPool: true,
    gridPosition: null,
  }));
};

const shuffleArray = (array: Piece[]): Piece[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Puzzle() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const minigamesMode = localStorage.getItem('minigamesMode');
      return minigamesMode !== 'true';
    }
    return true;
  });
  const [currentImage, setCurrentImage] = useState<string>('');
  const [pieces, setPieces] = useState<Piece[]>(shuffleArray(createInitialPuzzle()));
  const [draggedPiece, setDraggedPiece] = useState<Piece | null>(null);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  // Initialize audio on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/puzzle.mp3');
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

    if (!showDialog && !isComplete && isMusicPlaying) {
      audioRef.current.play().catch(error => {
        console.log('Audio playback failed:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [showDialog, isComplete, isMusicPlaying]);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsMusicPlaying(true))
        .catch(error => console.log('Music playback failed:', error));
    }
  };

  // Initialize with random image
  useEffect(() => {
    const randomImage = PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];
    setCurrentImage(randomImage);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      }
      if (isComplete && e.key === 'Enter') {
        handleShuffle();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router, isComplete]);

  useEffect(() => {
    const allPlaced = pieces.every(piece => !piece.inPool);
    const allCorrect = pieces.every(piece => piece.gridPosition === piece.originalPosition);
    setIsComplete(allPlaced && allCorrect && moves > 0);
  }, [pieces, moves]);

  useEffect(() => {
    if (isComplete) {
      setShowVictory(true);
    }
  }, [isComplete]);

  const handleShuffle = () => {
    setPieces(shuffleArray(createInitialPuzzle()));
    setMoves(0);
    setIsComplete(false);
    setShowVictory(false);
  };

  const handleChangeImage = () => {
    const currentIndex = PUZZLE_IMAGES.indexOf(currentImage);
    const nextIndex = (currentIndex + 1) % PUZZLE_IMAGES.length;
    setCurrentImage(PUZZLE_IMAGES[nextIndex]);
    // Reset puzzle when changing image
    setPieces(shuffleArray(createInitialPuzzle()));
    setMoves(0);
    setIsComplete(false);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, piece: Piece) => {
    setDraggedPiece(piece);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnGrid = (e: React.DragEvent<HTMLDivElement>, gridPosition: number) => {
    e.preventDefault();

    if (!draggedPiece) {
      return;
    }

    setPieces(prevPieces => {
      const newPieces = prevPieces.map(piece => {
        // If there's already a piece in this grid position, send it back to pool
        if (piece.gridPosition === gridPosition && piece.id !== draggedPiece.id) {
          return { ...piece, inPool: true, gridPosition: null };
        }
        // Place the dragged piece in the grid
        if (piece.id === draggedPiece.id) {
          return { ...piece, inPool: false, gridPosition };
        }
        return piece;
      });
      return newPieces;
    });

    setMoves(prev => prev + 1);
    setDraggedPiece(null);
  };

  const handleDropOnPool = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggedPiece || draggedPiece.inPool) {
      return;
    }

    setPieces(prevPieces => {
      const newPieces = prevPieces.map(piece => {
        if (piece.id === draggedPiece.id) {
          return { ...piece, inPool: true, gridPosition: null };
        }
        return piece;
      });
      return newPieces;
    });

    setMoves(prev => prev + 1);
    setDraggedPiece(null);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
  };

  const getPieceAtGridPosition = (position: number): Piece | undefined => {
    return pieces.find(piece => piece.gridPosition === position);
  };

  const getPoolPieces = (): Piece[] => {
    return pieces.filter(piece => piece.inPool);
  };

  const getBackgroundPosition = (originalPosition: number): string => {
    const row = Math.floor(originalPosition / GRID_SIZE);
    const col = originalPosition % GRID_SIZE;
    // For a 4x4 grid, each piece needs to show a different section
    // With background-size: 400%, we need to position at 0%, 33.33%, 66.66%, 100% of the container
    const xPercent = (col / (GRID_SIZE - 1)) * 100;
    const yPercent = (row / (GRID_SIZE - 1)) * 100;
    return `${xPercent}% ${yPercent}%`;
  };

  if (showDialog) {
    return (
      <GameDialog
        stepNumber={6}
        stepName="Step 6"
        skillName="Percepción Visual"
        description="Este desafio pone a prueba tu capacidad de percepcion visual y organizacion espacial. Arma el rompecabezas lo mas rapido que puedas.<br />Buena suerte."
        imageUrl="/sigmund.png"
        imageOutside={false}
        hideHeader={true}
        alertTitle="Puzzle"
        onStart={() => setShowDialog(false)}
        onBack={() => router.push('/')}
      />
    );
  }

  if (showVictory) {
    return <VictoryDialog nextGamePath="/flappybird" levelNumber={3} />;
  }

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => router.push('/')} title="Back to menu">
        <span className={styles.arrow}>←</span>
      </button>
      <div className={styles.gameWrapper}>
        <h1 className={styles.title}>PUZZLE</h1>

        <div className={styles.gameArea}>
          <div className={styles.poolContainer}>
            <h3 className={styles.poolTitle}>PIECES</h3>
            <div
              className={styles.pool}
              onDragOver={handleDragOver}
              onDrop={handleDropOnPool}
            >
              {getPoolPieces().map((piece) => (
                <div
                  key={piece.id}
                  className={`${styles.poolPiece} ${
                    draggedPiece?.id === piece.id ? styles.dragging : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, piece)}
                  onDragEnd={handleDragEnd}
                  style={{
                    backgroundImage: `url(${currentImage})`,
                    backgroundPosition: getBackgroundPosition(piece.originalPosition),
                    backgroundSize: '400% 400%',
                  }}
                />
              ))}
            </div>
          </div>

          <div className={styles.puzzleContainer}>
            <div className={styles.puzzleGrid}>
              {Array.from({ length: TOTAL_PIECES }).map((_, position) => {
                const piece = getPieceAtGridPosition(position);

                return (
                  <div
                    key={position}
                    className={styles.puzzleSlot}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnGrid(e, position)}
                  >
                    {piece && (
                      <div
                        className={`${styles.puzzlePiece} ${
                          draggedPiece?.id === piece.id ? styles.dragging : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, piece)}
                        onDragEnd={handleDragEnd}
                        style={{
                          backgroundImage: `url(${currentImage})`,
                          backgroundPosition: getBackgroundPosition(piece.originalPosition),
                          backgroundSize: '400% 400%',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {isComplete && (
              <div className={styles.winOverlay}>
                <div className={styles.winBox}>
                  <h2>🎉 COMPLETE! 🎉</h2>
                  <p className={styles.finalScore}>MOVES: {moves}</p>
                  <button className={styles.button} onClick={handleShuffle}>
                    PLAY AGAIN
                  </button>
                  <button className={styles.button} onClick={() => router.push('/')}>
                    MAIN MENU
                  </button>
                </div>
              </div>
            )}

            {showPreview && (
              <div className={styles.previewOverlay}>
                <div className={styles.previewBox}>
                  <img src={currentImage} alt="Preview" className={styles.previewImage} />
                </div>
              </div>
            )}
          </div>

          <div className={styles.statsContainer}>
            <div className={styles.statBox}>
              <h3>MOVES</h3>
              <p className={styles.statValue}>{moves}</p>
            </div>
            <button
              className={styles.iconButton}
              onClick={handleShuffle}
              title="Shuffle pieces"
            >
              🔀
            </button>
            <button
              className={styles.iconButton}
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
              title="Preview image"
            >
              👁️
            </button>
            <button
              className={styles.iconButton}
              onClick={handleChangeImage}
              title="Change image"
            >
              🖼️
            </button>
            <button
              className={styles.iconButton}
              onClick={toggleMusic}
              title={isMusicPlaying ? 'Pausar música' : 'Reproducir música'}
            >
              {isMusicPlaying ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        <div className={styles.controls}>
          <p>DRAG PIECES FROM THE POOL TO THE PUZZLE GRID | ESC MENU</p>
          <p>PLACE ALL PIECES IN THE CORRECT POSITION TO WIN!</p>
        </div>
      </div>
    </div>
  );
}
