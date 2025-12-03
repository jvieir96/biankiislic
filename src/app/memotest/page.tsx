'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GameDialog from '@/components/GameDialog';
import VictoryDialog from '@/components/VictoryDialog';
import styles from './memotest.module.css';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const cardValues = ['/bbgigante.png', '/fussile.png', '/chocolate.png', '/pinkprincess.png', '/terra2.png'];

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let id = 0;

  cardValues.forEach(value => {
    deck.push({ id: id++, value, isFlipped: false, isMatched: false });
    deck.push({ id: id++, value, isFlipped: false, isMatched: false });
  });

  // Shuffle the deck
  return deck.sort(() => Math.random() - 0.5);
};

export default function Memotest() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const minigamesMode = localStorage.getItem('minigamesMode');
      return minigamesMode !== 'true';
    }
    return true;
  });
  const [cards, setCards] = useState<Card[]>(createDeck());
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  // Initialize audio on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/memotest.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.15;
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

    if (!showDialog && !gameWon && isMusicPlaying) {
      audioRef.current.play().catch(error => {
        console.log('Audio playback failed:', error);
      });
    } else {
      audioRef.current.pause();
    }
  }, [showDialog, gameWon, isMusicPlaying]);

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

  useEffect(() => {
    if (flippedCards.length === 2) {
      setIsChecking(true);
      const [firstId, secondId] = flippedCards;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard?.value === secondCard?.value) {
        // Match found
        setTimeout(() => {
          setCards(prev =>
            prev.map(card =>
              card.id === firstId || card.id === secondId
                ? { ...card, isMatched: true, isFlipped: true }
                : card
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
        }, 800);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev =>
            prev.map(card =>
              card.id === firstId || card.id === secondId
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
      setMoves(prev => prev + 1);
    }
  }, [flippedCards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.isMatched)) {
      setTimeout(() => {
        setGameWon(true);
        setShowVictory(true);
      }, 500);
    }
  }, [cards]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      }
      if (gameWon && e.key === 'Enter') {
        handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router, gameWon]);

  const handleCardClick = (id: number) => {
    if (isChecking || flippedCards.length >= 2) return;

    const card = cards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    setCards(prev =>
      prev.map(c => (c.id === id ? { ...c, isFlipped: true } : c))
    );
    setFlippedCards(prev => [...prev, id]);
  };

  const handleRestart = () => {
    setCards(createDeck());
    setFlippedCards([]);
    setMoves(0);
    setGameWon(false);
    setShowVictory(false);
    setIsChecking(false);
  };

  if (showDialog) {
    return (
      <GameDialog
        stepNumber={2}
        stepName="Step 2"
        skillName="Entrenamiento de Memoria"
        description="Vamos con el segundo. Para este desafío vas a necesitar la memoria aguda y confiable.<br />Cuento con vos."
        imageUrl="/sigmund.png"
        imageOutside={false}
        hideHeader={true}
        alertTitle="Memotest"
        onStart={() => setShowDialog(false)}
        onBack={() => router.push('/')}
      />
    );
  }

  if (showVictory) {
    return <VictoryDialog nextGamePath="/pacman" levelNumber={1} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameWrapper}>
        <h1 className={styles.title}>MEMOTEST</h1>

        <div className={styles.scoreBox}>
          <div className={styles.scoreContent}>
            <div>
              <h3>MOVES</h3>
              <p className={styles.scoreValue}>{moves}</p>
            </div>
            <button
              onClick={toggleMusic}
              className={styles.musicButton}
              title={isMusicPlaying ? 'Pausar música' : 'Reproducir música'}
            >
              {isMusicPlaying ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        <div className={styles.cardGrid}>
          {cards.map(card => (
            <div
              key={card.id}
              className={`${styles.card} ${
                card.isFlipped || card.isMatched ? styles.flipped : ''
              } ${card.isMatched ? styles.matched : ''}`}
              onClick={() => handleCardClick(card.id)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardFront}>?</div>
                <div className={styles.cardBack}>
                  <img src={card.value} alt="card" className={styles.cardImage} />
                </div>
              </div>
            </div>
          ))}
        </div>


        <div className={styles.controls}>
          <p>CLICK CARDS TO FLIP | MATCH ALL PAIRS TO WIN</p>
          <p>ESC MENU</p>
        </div>
      </div>
    </div>
  );
}
