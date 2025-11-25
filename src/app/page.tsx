'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from "./page.module.css";

const menuItems = [
  { id: 'level-1', label: 'Resolución de Problemas', name: 'Step 1', game: 'Tetris', icon: '🧩', color: '#6b8dd6', hoverColor: '#5a7bc5' },
  { id: 'level-2', label: 'Entrenamiento de Memoria', name: 'Step 2', game: 'Memory Game', icon: '🧠', color: '#9575cd', hoverColor: '#8464bc' },
  { id: 'level-3', label: 'Manejo Emocional', name: 'Step 3', game: 'Pac-Man', icon: '😊', color: '#5fb89d', hoverColor: '#4ea78c' },
  { id: 'level-4', label: 'Percepción Visual', name: 'Step 4', game: 'Puzzle', icon: '👁️', color: '#e57373', hoverColor: '#d46262' },
  { id: 'level-5', label: 'Timing y Precisión', name: 'Step 5', game: 'Flappy Bird', icon: '⏱️', color: '#64b5f6', hoverColor: '#53a4e5' },
  { id: 'level-6', label: 'Velocidad y Reflejos', name: 'Step 6', game: 'Retro Racer', icon: '⚡', color: '#ffb74d', hoverColor: '#eea63c' },
];

export default function Home() {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<number>(0);
  const [showIntro, setShowIntro] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [minigamesMode, setMinigamesMode] = useState(false);

  useEffect(() => {
    // Load completed levels from localStorage
    const saved = localStorage.getItem('completedLevels');
    if (saved) {
      setCompletedLevels(parseInt(saved, 10));
    }

    // Load minigames mode from localStorage
    const savedMinigamesMode = localStorage.getItem('minigamesMode');
    if (savedMinigamesMode === 'true') {
      setMinigamesMode(true);
    }

    // Check if intro has been shown
    const introShown = localStorage.getItem('introShown');
    if (!introShown) {
      setShowIntro(true);
    }
  }, []);

  // Ensure selectedIndex is always within unlocked levels (unless minigames mode is active)
  useEffect(() => {
    if (!minigamesMode && selectedIndex > completedLevels) {
      setSelectedIndex(Math.min(completedLevels, menuItems.length - 1));
    }
  }, [completedLevels, selectedIndex, minigamesMode]);

  const handleCloseIntro = () => {
    localStorage.setItem('introShown', 'true');
    setShowIntro(false);
  };

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showSettingsMenu && !target.closest(`.${styles.settingsContainer}`)) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          // Move left within available levels
          if (prev > 0) {
            return prev - 1;
          } else {
            // Wrap to the last available level
            const maxAvailable = minigamesMode ? menuItems.length - 1 : Math.min(completedLevels, menuItems.length - 1);
            return maxAvailable;
          }
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          // Move right within available levels
          const maxAvailable = minigamesMode ? menuItems.length - 1 : Math.min(completedLevels, menuItems.length - 1);
          if (prev < maxAvailable) {
            return prev + 1;
          } else {
            // Wrap to the first level
            return 0;
          }
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Navigate if the level is unlocked or minigames mode is active
        if (minigamesMode || selectedIndex <= completedLevels) {
          handleMenuClick(menuItems[selectedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, completedLevels, minigamesMode]);

  const handleMenuClick = (id: string) => {
    console.log(`Menu item clicked: ${id}`);

    // Find the index of the clicked level
    const clickedIndex = menuItems.findIndex(item => item.id === id);

    // Check if the level is unlocked (index <= completedLevels) unless minigames mode is active
    if (!minigamesMode && clickedIndex > completedLevels) {
      console.log('Level is locked!');
      return; // Don't navigate if level is locked
    }

    // Navigate to different game levels
    switch (id) {
      case 'level-1':
        router.push('/tetris');
        break;
      case 'level-2':
        router.push('/memotest');
        break;
      case 'level-3':
        router.push('/pacman');
        break;
      case 'level-4':
        router.push('/puzzle');
        break;
      case 'level-5':
        router.push('/flappybird');
        break;
      case 'level-6':
        router.push('/retroracer');
        break;
    }
  };

  return (
    <div className={styles.page}>
      {/* Settings Menu Button */}
      <div className={styles.settingsContainer}>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          aria-label="Configuración"
        >
          ⚙️
        </button>

        {showSettingsMenu && (
          <div className={styles.settingsDropdown}>
            <div
              className={styles.settingsOption}
              onClick={() => {
                const newMode = !minigamesMode;
                setMinigamesMode(newMode);
                localStorage.setItem('minigamesMode', newMode.toString());
                console.log('Modo minijuegos:', newMode);
              }}
            >
              <input
                type="checkbox"
                checked={minigamesMode}
                onChange={() => {}}
                className={styles.checkbox}
              />
              <span>Modo Minijuegos</span>
            </div>
            <div
              className={styles.settingsOption}
              onClick={() => {
                if (confirm('¿Estás seguro de que quieres resetear todo el progreso?')) {
                  localStorage.setItem('completedLevels', '0');
                  setCompletedLevels(0);
                  setSelectedIndex(0);
                  setShowSettingsMenu(false);
                  alert('Progreso reseteado. Solo el primer nivel está desbloqueado.');
                }
              }}
            >
              <span>🔄 Resetear Progreso</span>
            </div>
          </div>
        )}
      </div>

      {showIntro && (
        <div className={styles.introOverlay} onClick={handleCloseIntro}>
          <div className={styles.introContent}>
            <div className={styles.introMain}>
              <div className={styles.introImageContainer}>
                <img src="/sigmund.png" alt="Sigmund" className={styles.introImage} />
              </div>
              <div className={styles.introTextContainer}>
                <div className={styles.introTitle}>Bienvenida Licenciada</div>
                <div className={styles.introDescription}>
                  Hola Licenciada,<br />
                  Felicitaciones por la obtención de su título. Como verá, ahora somos colegas, y quiero aprovechar este momento para darle su primer trabajo de campo como psicóloga.<br />
                  En este caso tenemos 6 desafíos que retan la percepción, emociones y lógica de uno. Con sus habilidades creo que esto será pan comido.<br />
                  Cuento con usted.<br /><br />
                  -El Sigmund
                </div>
                <div className={styles.introButton}>
                  Empezar desafio
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fireworks">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`firework firework-${i + 1}`}>
            {[...Array(12)].map((_, j) => (
              <div key={j} className={`particle particle-${j}`}></div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.container}>
        <h1 className={styles.title}>Lic Bianqui Games</h1>

        <div className={styles.menuContainer}>
          <div className={styles.progressPath}>
            {menuItems.map((item, index) => (
              <>
                <div key={item.id} className={styles.pathSegment}>
                  {/* Personaje en el item seleccionado */}
                  {index === selectedIndex && (
                    <div className={styles.character}>
                      <img src="/crazy2.png" alt="character" className={styles.characterImage} />
                    </div>
                  )}

                  {/* Punto del nivel con menú item */}
                  <div
                    className={`${styles.levelPoint} ${
                      index < completedLevels ? styles.completed : ''
                    } ${index === completedLevels ? styles.current : ''}`}
                  >
                    <div
                      className={styles.pointCircle}
                      style={{
                        borderColor: `${item.color}66`,
                        backgroundColor: `${item.color}26`,
                        opacity: (minigamesMode || index <= completedLevels) ? 1 : 0.4,
                      }}
                    >
                      {(minigamesMode || index <= completedLevels) ? item.icon : '?'}
                    </div>

                    {/* Menu Item integrado */}
                    <div
                      className={`${styles.menuItem} ${index === selectedIndex ? styles.selected : ''} ${(!minigamesMode && index > completedLevels) ? styles.locked : ''}`}
                      onClick={() => handleMenuClick(item.id)}
                      onMouseEnter={() => {
                        // Allow hover on unlocked levels or in minigames mode
                        if (minigamesMode || index <= completedLevels) {
                          setSelectedIndex(index);
                        }
                      }}
                      style={{
                        background: index === selectedIndex
                          ? `linear-gradient(135deg, ${item.color}, ${item.hoverColor})`
                          : `linear-gradient(135deg, ${item.color}26, ${item.color}26)`,
                        borderColor: `${item.color}4d`,
                        boxShadow: index === selectedIndex
                          ? `0 10px 30px ${item.color}80`
                          : `0 4px 15px ${item.color}33`,
                        opacity: (minigamesMode || index <= completedLevels) ? 1 : 0.4,
                        cursor: (minigamesMode || index <= completedLevels) ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <div className={styles.skillName}>{(minigamesMode || index <= completedLevels) ? item.label : '???'}</div>
                    </div>
                  </div>
                </div>

                {/* Conector */}
                {index < menuItems.length - 1 && (
                  <div key={`connector-${index}`} className={styles.pathConnector}>
                  </div>
                )}
              </>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
