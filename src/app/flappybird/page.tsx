'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GameDialog from '@/components/GameDialog';
import VictoryDialog from '@/components/VictoryDialog';
import styles from './flappybird.module.css';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 50;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 3;

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

export default function FlappyBird() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const minigamesMode = localStorage.getItem('minigamesMode');
      return minigamesMode !== 'true';
    }
    return true;
  });
  const [dialogStep, setDialogStep] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [bird, setBird] = useState<Bird>({ y: GAME_HEIGHT / 2, velocity: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [housePosition, setHousePosition] = useState(GAME_WIDTH + 500);
  const [raindrops, setRaindrops] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);
  const [lightning, setLightning] = useState(false);
  const [nearHome, setNearHome] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loseSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  // Initialize raindrops (minimal for performance)
  useEffect(() => {
    const drops: Array<{ id: number; left: number; delay: number; duration: number }> = [];
    for (let i = 0; i < 35; i++) {
      drops.push({
        id: i,
        left: (i * 100) / 35, // Evenly distributed across width
        delay: Math.random() * 0.8,
        duration: 0.6,
      });
    }
    setRaindrops(drops);
  }, []);

  // Initialize audio on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/flappy.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
      audioRef.current.playbackRate = 1.1; // Slightly faster for more tension
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

    if (!showDialog && gameStarted && !gameOver && !gameWon && isMusicPlaying) {
      audioRef.current.play().catch(error => {
        console.log('Audio playback failed:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [showDialog, gameStarted, gameOver, gameWon, isMusicPlaying]);

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

  // Lightning effect
  // useEffect(() => {
  //   if (!gameStarted || gameOver || gameWon) return;

  //   const triggerLightning = () => {
  //     setLightning(true);
  //     setTimeout(() => setLightning(false), 300);
  //   };

  //   const interval = setInterval(() => {
  //     if (Math.random() < 0.3) {
  //       triggerLightning();
  //     }
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, [gameStarted, gameOver, gameWon]);

  const jump = () => {
    if (gameOver || gameWon) return;
    if (!gameStarted) {
      setGameStarted(true);
    }
    setBird(prev => ({ ...prev, velocity: JUMP_STRENGTH }));
  };

  const updateGame = useCallback(() => {
    if (gameOver || gameWon || !gameStarted) return;

    // Update bird position
    setBird(prev => {
      const newVelocity = prev.velocity + GRAVITY;
      const newY = prev.y + newVelocity;

      // Check if bird hit ground or ceiling
      if (newY > GAME_HEIGHT - BIRD_SIZE || newY < 0) {
        setGameOver(true);
        return prev;
      }

      return { y: newY, velocity: newVelocity };
    });

    // Update pipes
    setPipes(prev => {
      let newPipes = prev.map(pipe => ({
        ...pipe,
        x: pipe.x - PIPE_SPEED,
      }));

      // Remove off-screen pipes
      newPipes = newPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

      // Add new pipe (only if score is less than 30)
      if (score < 30 && (newPipes.length === 0 || newPipes[newPipes.length - 1].x < GAME_WIDTH - 250)) {
        const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50;
        newPipes.push({
          x: GAME_WIDTH,
          topHeight,
          passed: false,
        });
      }

      // Check for score
      newPipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < GAME_WIDTH / 2 - BIRD_SIZE / 2) {
          pipe.passed = true;
          setScore(s => s + 1);
        }
      });

      return newPipes;
    });

    // Move house when score reaches certain point
    if (score >= 30) {
      setHousePosition(prev => prev - PIPE_SPEED);
    }

    // Check if getting near home (trigger weather change)
    let birdX = GAME_WIDTH / 2;
    const distanceToHome = housePosition - birdX;
    if (distanceToHome < 250 && distanceToHome > 0 && !nearHome) {
      setNearHome(true);
    }

    // Check if bird reached the house
    birdX = GAME_WIDTH / 2;
    const houseWidth = 120;
    const houseHeight = 120;
    const houseY = (GAME_HEIGHT * 0.7) - houseHeight;

    if (birdX + BIRD_SIZE >= housePosition && birdX <= housePosition + houseWidth &&
        bird.y + BIRD_SIZE >= houseY && bird.y <= houseY + houseHeight) {
      setGameWon(true);
      setShowVictory(true);
      setGameStarted(false);
    }
  }, [gameOver, gameWon, gameStarted, score, housePosition, bird.y]);

  // Check collisions
  useEffect(() => {
    if (gameOver || gameWon || !gameStarted) return;

    const birdX = GAME_WIDTH / 2 - BIRD_SIZE / 2;
    const birdY = bird.y;

    const collision = pipes.some(pipe => {
      const inPipeXRange = birdX + BIRD_SIZE > pipe.x && birdX < pipe.x + PIPE_WIDTH;
      const hitTopPipe = birdY < pipe.topHeight;
      const hitBottomPipe = birdY + BIRD_SIZE > pipe.topHeight + PIPE_GAP;

      return inPipeXRange && (hitTopPipe || hitBottomPipe);
    });

    if (collision) {
      setGameOver(true);
    }
  }, [bird.y, pipes, gameOver, gameWon, gameStarted]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      }

      if ((gameOver || gameWon) && e.key === 'Enter') {
        setBird({ y: GAME_HEIGHT / 2, velocity: 0 });
        setPipes([]);
        setScore(0);
        setGameOver(false);
        setGameWon(false);
        setShowVictory(false);
        setGameStarted(false);
        setHousePosition(GAME_WIDTH + 500);
        setNearHome(false);
      }

      if (e.key === 'Escape') {
        router.push('/');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router, gameOver, gameWon]);

  useEffect(() => {
    const interval = setInterval(updateGame, 1000 / 60);
    return () => clearInterval(interval);
  }, [updateGame]);

  if (showDialog) {
    if (dialogStep === 0) {
      return (
        <GameDialog
          stepNumber={5}
          stepName="Step 5"
          skillName="Timing y Precisión"
          description="Ocurrio un imprevisto, y tenemos a un sujeto provocando alboroto, dado el alto nivel que venis demostrando y que estamos en la recta final, te voy a dejar sola desde aqui.<br />Confio en vos, nos vemos al final."
          imageUrl="/sigmund.png"
          imageOutside={false}
          hideHeader={true}
          showOnlyArrow={true}
          onStart={() => setDialogStep(1)}
          onBack={() => router.push('/')}
        />
      );
    } else {
      return (
        <GameDialog
          stepNumber={7}
          stepName="Step 7"
          skillName="Timing & Precision"
          alertTitle="AYUDAAAA...."
          description="Te necesito para volver a casa, me perdi durante una tormenta, o persiguiendo a un RICO MACH, quien sabe JAA!"
          onStart={() => setShowDialog(false)}
          onBack={() => router.push('/')}
          imageUrl="/terra2.png"
        />
      );
    }
  }

  if (showVictory) {
    return <VictoryDialog nextGamePath="/retroracer" levelNumber={4} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameWrapper}>
        <h1 className={styles.title}>FLAPPY TERRA</h1>

        <div className={styles.gameArea}>
          <div
            className={`${styles.gameCanvas} ${nearHome || gameWon ? styles.sunny : ''}`}
            onClick={jump}
          >
            {/* Rain Effect */}
            {!nearHome && !gameWon && raindrops.map((drop) => (
              <div
                key={drop.id}
                className={styles.rain}
                style={{
                  left: `${drop.left}%`,
                  animationDelay: `${drop.delay}s`,
                  animationDuration: `${drop.duration}s`,
                }}
              />
            ))}

            {/* Lightning Effect */}
            {/* <div className={`${styles.lightning} ${lightning ? styles.flash : ''}`} /> */}

            {/* Bird */}
            <div
              className={styles.bird}
              style={{
                top: `${bird.y}px`,
                left: `${GAME_WIDTH / 2 - BIRD_SIZE / 2}px`,
              }}
            >
              <img src="/terra2.png" alt="bird" className={styles.birdImage} />
            </div>

            {/* House */}
            {score >= 30 && (
              <div
                className={styles.house}
                style={{
                  left: `${housePosition}px`,
                  top: `${GAME_HEIGHT * 0.7 - 120}px`,
                }}
              >
                🏠
              </div>
            )}

            {/* Pipes */}
            {pipes.map((pipe, index) => (
              <div key={index}>
                {/* Top pipe */}
                <div
                  className={styles.pipe}
                  style={{
                    left: `${pipe.x}px`,
                    top: 0,
                    height: `${pipe.topHeight}px`,
                  }}
                />
                {/* Bottom pipe */}
                <div
                  className={styles.pipe}
                  style={{
                    left: `${pipe.x}px`,
                    top: `${pipe.topHeight + PIPE_GAP}px`,
                    height: `${GAME_HEIGHT - pipe.topHeight - PIPE_GAP}px`,
                  }}
                />
              </div>
            ))}

            {!gameStarted && !gameOver && !gameWon && (
              <div className={styles.startOverlay}>
                <div className={styles.startBox}>
                  <img src="/terra2.png" alt="terra" className={styles.startImage} />
                  <h2>LISTO?</h2>
                  <p className={styles.instruction}>PRESIONA ESPACIO O CLICK PARA COMENZAR</p>
                </div>
              </div>
            )}

            {gameOver && (
              <div className={styles.gameOverOverlay}>
                <div className={styles.gameOverBox}>
                  <img src="/triste.jpg" alt="sad" className={styles.sadImage} />
                  <h2>Perdiste! :(</h2>
                  <p className={styles.finalScore}>SCORE: {score}</p>
                  <p className={styles.instruction}>PRESS ENTER TO PLAY AGAIN</p>
                  <p className={styles.instruction}>PRESS ESC FOR MENU</p>
                </div>
              </div>
            )}

            {gameWon && (
              <div className={styles.winMessage}>
                <h2>🎉 YOU MADE IT HOME! 🎉</h2>
                <p>PRESS ENTER TO PLAY AGAIN</p>
              </div>
            )}
          </div>

          <div className={styles.scoreBox}>
            <h3>SCORE</h3>
            <p className={styles.scoreValue}>{score}</p>
            <button
              onClick={toggleMusic}
              className={styles.musicButton}
              title={isMusicPlaying ? 'Pausar música' : 'Reproducir música'}
            >
              {isMusicPlaying ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        <div className={styles.controls}>
          <p>SPACE / CLICK TO JUMP | ESC MENU</p>
          <p>AVOID THE PIPES AND FLY AS FAR AS YOU CAN!</p>
        </div>
      </div>
    </div>
  );
}
