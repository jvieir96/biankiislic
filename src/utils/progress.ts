export const markLevelComplete = (levelNumber: number) => {
  if (typeof window === 'undefined') return;

  const completed = parseInt(localStorage.getItem('completedLevels') || '0', 10);
  if (levelNumber > completed) {
    localStorage.setItem('completedLevels', levelNumber.toString());
  }
};

export const getCompletedLevels = (): number => {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem('completedLevels') || '0', 10);
};
