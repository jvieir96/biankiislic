'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './VictoryDialog.module.css';

interface VictoryDialogProps {
  onContinue?: () => void;
  nextGamePath?: string;
  levelNumber?: number; // Level index (0-based: 0=tetris, 1=memotest, etc.)
}

export default function VictoryDialog({ onContinue, nextGamePath, levelNumber }: VictoryDialogProps) {
  const router = useRouter();

  // Update completedLevels in localStorage when victory dialog is shown
  useEffect(() => {
    if (levelNumber !== undefined) {
      const savedLevels = localStorage.getItem('completedLevels');
      const currentCompleted = savedLevels ? parseInt(savedLevels, 10) : 0;

      // Update to the next level if this level is at or beyond the current progress
      if (levelNumber + 1 > currentCompleted) {
        localStorage.setItem('completedLevels', (levelNumber + 1).toString());
      }
    }
  }, [levelNumber]);

  const handleContinue = () => {
    if (nextGamePath) {
      router.push(nextGamePath);
    } else if (onContinue) {
      onContinue();
    } else {
      router.push('/');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.confettiContainer}>
        {[...Array(20)].map((_, i) => {
          const angle = (360 / 20) * i;
          const radians = (angle * Math.PI) / 180;
          const distance = 400;
          const x = Math.cos(radians) * distance;
          const y = Math.sin(radians) * distance;

          return (
            <div
              key={i}
              className={styles.confetti}
              style={{
                '--x': `${x}px`,
                '--y': `${y}px`,
                '--delay': `${i * 0.05}s`,
                '--color': ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#9370DB'][i % 5],
              } as React.CSSProperties}
            />
          );
        })}
      </div>
      <div className={styles.dialog}>
        <h1 className={styles.title}>Bravoooo</h1>
        <img src="/study2.png" alt="victory" className={styles.image} />
        <div className={styles.buttonContainer}>
          <button className={styles.continueButton} onClick={handleContinue}>
            Continuar
          </button>
          <button className={styles.menuButton} onClick={() => router.push('/')}>
            Menú
          </button>
        </div>
      </div>
    </div>
  );
}
