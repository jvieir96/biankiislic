'use client';

import { useState } from 'react';
import styles from './GameDialog.module.css';

interface GameDialogProps {
  stepNumber: number;
  stepName: string;
  skillName: string;
  description: string;
  onStart: () => void;
  onBack: () => void;
  imageUrl?: string;
  imageOutside?: boolean;
  alertTitle?: string;
  hideHeader?: boolean;
  showOnlyArrow?: boolean;
}

export default function GameDialog({
  stepNumber,
  stepName,
  skillName,
  description,
  onStart,
  onBack,
  imageUrl,
  imageOutside = false,
  alertTitle,
  hideHeader = false,
  showOnlyArrow = false,
}: GameDialogProps) {
  return (
    <div className={styles.overlay}>
      {imageOutside && imageUrl && (
        <img src={imageUrl} alt="game character" className={styles.outsideImage} />
      )}
      <div className={styles.dialog}>
        {!alertTitle && !hideHeader && (
          <div className={styles.header}>
            <h2 className={styles.stepTitle}>{stepName}</h2>
            <h3 className={styles.skillTitle}>{skillName}</h3>
          </div>
        )}

        {alertTitle && <h2 className={styles.alertTitle}>{alertTitle}</h2>}
        <div className={`${styles.content} ${!imageOutside && imageUrl ? styles.contentWithImage : ''}`}>
          {!imageOutside && imageUrl && (
            <div className={styles.imageContainer}>
              <img src={imageUrl} alt="game icon" className={styles.sideImage} />
            </div>
          )}
          {!imageOutside && !imageUrl && (
            <div className={styles.icon}>🧠</div>
          )}
          <div className={styles.textContainer}>
            <p className={styles.description} dangerouslySetInnerHTML={{ __html: description }}></p>
          </div>
        </div>

        <div className={styles.footer}>
          {showOnlyArrow ? (
            <button className={styles.arrowButton} onClick={onStart}>
              →
            </button>
          ) : (
            <>
              <button className={styles.backButton} onClick={onBack}>
                ← Menu
              </button>
              <button className={styles.startButton} onClick={onStart}>
                Empezar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
