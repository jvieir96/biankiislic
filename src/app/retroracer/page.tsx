'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GameDialog from '@/components/GameDialog';
import VictoryDialog from '@/components/VictoryDialog';
import styles from './retroracer.module.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 450;
const ROAD_WIDTH = 2000; // Road width
const SEGMENT_LENGTH = 200; // Segment size
const CAMERA_HEIGHT = 1000; // Camera height above road
const CAMERA_DEPTH = 0.84; // Camera depth for perspective (controls road width)
const DRAW_DISTANCE = 300;

interface RoadSegment {
  index: number;
  z: number; // Depth from camera
  curve: number; // Current curve offset
  color: string;
  obstacles: Array<{ x: number; type: string }>;
}

export default function RetroRacer() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDialog, setShowDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const minigamesMode = localStorage.getItem('minigamesMode');
      return minigamesMode !== 'true';
    }
    return true;
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [accelPressed, setAccelPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [reachedFinish, setReachedFinish] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVictory, setShowVictory] = useState(false);

  const roadSegments = useRef<RoadSegment[]>([]);
  const playerX = useRef(0);
  const roadCurve = useRef(0);
  const animationFrameId = useRef<number>(0);
  const carImageRef = useRef<HTMLImageElement | null>(null);
  const cloudTime = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load car image
  useEffect(() => {
    const img = new Image();
    img.src = '/toyinetap2.png';
    img.onload = () => {
      carImageRef.current = img;
    };
  }, []);

  // Setup dynamic racing music
  useEffect(() => {
    if (!gameStarted || gameOver || isMuted) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audioContext.destination);

    let stopMusic = false;

    // Fast-paced racing melody
    const melodyNotes = [
      // Energetic racing theme pattern
      523.25, 659.25, 783.99, 880.00, 783.99, 659.25, // C E G A G E
      587.33, 698.46, 880.00, 987.77, 880.00, 698.46, // D F A B A F
      523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, // C E G C' G E
      587.33, 739.99, 880.00, 987.77, 880.00, 739.99  // D F# A B A F#
    ];

    // Bass line for rhythm
    const bassNotes = [
      130.81, 130.81, 146.83, 146.83, // C C D D
      130.81, 130.81, 146.83, 146.83
    ];

    const playMelody = () => {
      let noteIndex = 0;

      const playNote = () => {
        if (stopMusic) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(masterGain);

        osc.type = 'square';
        osc.frequency.value = melodyNotes[noteIndex % melodyNotes.length];

        gain.gain.value = 0.3;
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.15);

        noteIndex++;
        setTimeout(playNote, 120); // Fast tempo for racing feel
      };

      playNote();
    };

    const playBass = () => {
      let bassIndex = 0;

      const playBassNote = () => {
        if (stopMusic) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(masterGain);

        osc.type = 'sawtooth';
        osc.frequency.value = bassNotes[bassIndex % bassNotes.length];

        gain.gain.value = 0.2;
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);

        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.4);

        bassIndex++;
        setTimeout(playBassNote, 480); // Bass rhythm
      };

      playBassNote();
    };

    // Start both melody and bass
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    playMelody();
    playBass();

    return () => {
      stopMusic = true;
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [gameStarted, gameOver, isMuted]);

  // Initialize road segments
  useEffect(() => {
    const segments: RoadSegment[] = [];
    const numSegments = 300;

    for (let i = 0; i < numSegments; i++) {
      const obstacles: Array<{ x: number; type: string }> = [];

      // Add obstacles randomly across the entire road width (including center)
      if (i > 20 && Math.random() < 0.25) {
        // Random position from -0.9 to 0.9 (covers entire road width)
        const x = (Math.random() - 0.5) * 1.8;
        obstacles.push({
          x: x,
          type: Math.random() > 0.5 ? 'cone' : 'barrel'
        });
      }

      // Add progressive curves based on position
      // Curves accumulate gradually for smooth bending
      let segmentCurve = 0;
      if (i > 50 && i < 120) {
        segmentCurve = 0.015; // Smooth right curve
      } else if (i > 150 && i < 220) {
        segmentCurve = -0.015; // Smooth left curve
      } else if (i > 250 && i < 300) {
        segmentCurve = 0.02; // Sharp right
      } else if (i > 330 && i < 400) {
        segmentCurve = -0.012; // Medium left
      } else if (i > 450 && i < 520) {
        segmentCurve = 0.018; // Strong right
      }

      segments.push({
        index: i,
        z: i * SEGMENT_LENGTH, // Position in 3D space
        curve: segmentCurve,
        color: Math.floor(i / 3) % 2 === 0 ? '#666' : '#888',
        obstacles
      });
    }
    roadSegments.current = segments;
  }, []);

  // Project 3D position to 2D screen coordinates with proper perspective
  const project = useCallback((x: number, y: number, z: number) => {
    if (z <= 0) z = 1; // Prevent division by zero

    const horizonY = CANVAS_HEIGHT * 0.35;

    // Simple perspective projection
    // Use 1/z for perspective: larger z (far) = smaller 1/z, smaller z (near) = larger 1/z
    const camera = 300; // Camera distance constant
    const perspective = camera / (z + camera);

    // Map perspective to screen Y
    // perspective close to 1 (near, small z) -> bottom (CANVAS_HEIGHT)
    // perspective close to 0 (far, large z) -> top (horizonY)
    const screenY = horizonY + (CANVAS_HEIGHT - horizonY) * perspective;

    // Horizontal position with lateral offset
    const scale = perspective;
    const screenX = CANVAS_WIDTH / 2 + (x * scale * 300);

    // Road width: increases as we get closer (larger perspective value)
    // Increased multiplier significantly for wider road
    const screenW = perspective * 3000;

    return { x: screenX, y: screenY, w: screenW, scale };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Ensure transparency is preserved
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Sky gradient - realistic sunset colors
    const horizonLine = CANVAS_HEIGHT * 0.35;
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, '#0d1b3e');      // Deep blue at top
    skyGradient.addColorStop(0.2, '#1e3a6e');    // Blue
    skyGradient.addColorStop(0.35, '#ff6b35');   // Deep orange at horizon
    skyGradient.addColorStop(0.5, '#ff8c42');    // Orange
    skyGradient.addColorStop(0.7, '#ffd166');    // Golden yellow
    skyGradient.addColorStop(1, '#ffe5b4');      // Peach/cream at bottom
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw clouds in the sky
    const drawCloud = (x: number, y: number, scale: number) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent white

      // Cloud made of circles
      ctx.beginPath();
      ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - 25 * scale, y + 5 * scale, 15 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + 25 * scale, y + 5 * scale, 15 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - 15 * scale, y - 5 * scale, 18 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + 15 * scale, y - 5 * scale, 18 * scale, 0, Math.PI * 2);
      ctx.fill();
    };

    // Moving clouds - subtle oscillating movement, independent of car movement
    cloudTime.current += 0.01; // Independent time increment

    // Each cloud oscillates in different directions with different ranges
    drawCloud(100 + Math.sin(cloudTime.current) * 15, 50, 0.8); // Left-right slow
    drawCloud(300 - Math.sin(cloudTime.current * 0.8) * 12, 70, 1.0); // Right-left slower
    drawCloud(450 + Math.sin(cloudTime.current * 1.2) * 18, 40, 0.9); // Left-right faster
    drawCloud(550 - Math.sin(cloudTime.current * 0.6) * 10, 80, 0.7); // Right-left very slow

    let cumulativeCurve = 0;

    // Draw a solid road base where the player car is to prevent sky showing through
    // This ensures smooth color continuity regardless of segment gaps
    ctx.fillStyle = '#7A7A7A';
    ctx.fillRect(0, CANVAS_HEIGHT * 0.75, CANVAS_WIDTH, CANVAS_HEIGHT * 0.25);

    // Draw road segments from far to near (back to front)
    for (let i = roadSegments.current.length - 1; i >= 0; i--) {
      const segment = roadSegments.current[i];
      const relativeZ = segment.z - distance;

      // Skip segments that are behind the camera or too far
      if (relativeZ <= 1 || relativeZ > DRAW_DISTANCE * SEGMENT_LENGTH) continue;

      // Calculate cumulative curve offset for this segment
      cumulativeCurve += segment.curve;

      // Project current segment position to screen (bottom of trapezoid)
      // Subtract playerX to keep player centered
      const projected = project(cumulativeCurve - playerX.current, 0, relativeZ);

      // Project next segment (top of trapezoid) for proper trapezoid shape
      const nextZ = relativeZ + SEGMENT_LENGTH;
      let nextCurve = cumulativeCurve;

      // Get next segment's curve if it exists
      if (i > 0) {
        nextCurve = cumulativeCurve + roadSegments.current[i - 1].curve;
      }

      const projectedNext = project(nextCurve - playerX.current, 0, nextZ);

      // Calculate road boundaries for trapezoid
      // Current segment (relativeZ) is the bottom edge
      // Next segment (nextZ = relativeZ + SEGMENT_LENGTH) is the top edge (farther away)
      const roadLeft = projected.x - projected.w / 2;
      const roadRight = projected.x + projected.w / 2;
      const roadLeftTop = projectedNext.x - projectedNext.w / 2;
      const roadRightTop = projectedNext.x + projectedNext.w / 2;

      // nextZ is farther, so projectedNext.y should be smaller (closer to horizon)
      // relativeZ is closer, so projected.y should be larger (closer to bottom)
      const topY = projectedNext.y;  // Far edge (top of trapezoid)
      const bottomY = projected.y;   // Near edge (bottom of trapezoid)

      // Skip only if segment is completely inverted
      // Don't skip segments just because they're partially off screen - we need them for complete coverage
      if (topY >= bottomY) continue;

      // Clamp Y values to canvas bounds to ensure complete coverage
      const horizonLine = CANVAS_HEIGHT * 0.35;
      const clampedTopY = Math.max(topY, horizonLine);
      const clampedBottomY = Math.min(bottomY, CANVAS_HEIGHT);

      // Draw grass (outside road) as trapezoids first
      // Base grass color on absolute Z position for smoother transitions
      const grassPatternZ = Math.floor(segment.z / SEGMENT_LENGTH);
      const grassColor = grassPatternZ % 2 === 0 ? '#10AA10' : '#009A00';
      ctx.fillStyle = grassColor;

      // Left grass trapezoid
      ctx.beginPath();
      ctx.moveTo(0, clampedTopY);
      ctx.lineTo(roadLeftTop, clampedTopY);
      ctx.lineTo(roadLeft, clampedBottomY);
      ctx.lineTo(0, clampedBottomY);
      ctx.closePath();
      ctx.fill();

      // Right grass trapezoid
      ctx.beginPath();
      ctx.moveTo(roadRightTop, clampedTopY);
      ctx.lineTo(CANVAS_WIDTH, clampedTopY);
      ctx.lineTo(CANVAS_WIDTH, clampedBottomY);
      ctx.lineTo(roadRight, clampedBottomY);
      ctx.closePath();
      ctx.fill();

      // Draw road as trapezoid on top (ensures it covers the area completely)
      // Use a consistent color for segments near the player to avoid jarring color changes
      // Only alternate colors for segments far ahead
      let roadColor;
      if (relativeZ < 3000) {
        // Near the player, keep consistent color
        roadColor = '#7A7A7A';
      } else {
        // Far segments can alternate for depth perception
        roadColor = Math.floor(segment.index / 3) % 2 === 0 ? '#7A7A7A' : '#5A5A5A';
      }
      ctx.fillStyle = roadColor;

      ctx.beginPath();
      ctx.moveTo(roadLeftTop, clampedTopY);
      ctx.lineTo(roadRightTop, clampedTopY);
      ctx.lineTo(roadRight, clampedBottomY);
      ctx.lineTo(roadLeft, clampedBottomY);
      ctx.closePath();
      ctx.fill();

      // Center lane divider (yellow dashed) - as trapezoid
      // Base pattern on absolute Z position instead of segment index for smoother transitions
      const patternZ = Math.floor(segment.z / (SEGMENT_LENGTH * 3));

      if (patternZ % 2 === 0) {
        const lineWidthBottom = Math.max(1.5, projected.w / 50); // Reduced from /30 to /50 for thinner lines
        const lineWidthTop = Math.max(1.5, projectedNext.w / 50); // Reduced from /30 to /50 for thinner lines
        ctx.fillStyle = '#FFFF00';

        const centerXBottom = projected.x;
        const centerXTop = projectedNext.x;

        ctx.beginPath();
        ctx.moveTo(centerXTop - lineWidthTop / 2, clampedTopY);
        ctx.lineTo(centerXTop + lineWidthTop / 2, clampedTopY);
        ctx.lineTo(centerXBottom + lineWidthBottom / 2, clampedBottomY);
        ctx.lineTo(centerXBottom - lineWidthBottom / 2, clampedBottomY);
        ctx.closePath();
        ctx.fill();
      }

      // Side rumble strips - as trapezoids
      // Base pattern on absolute Z position for smoother transitions
      const rumblePatternZ = Math.floor(segment.z / (SEGMENT_LENGTH * 2));

      if (rumblePatternZ % 2 === 0) {
        const rumbleWidthBottom = Math.max(1, projected.w / 60);
        const rumbleWidthTop = Math.max(1, projectedNext.w / 60);
        ctx.fillStyle = '#FFFFFF';

        // Left rumble
        const leftRumbleXBottom = projected.x - projected.w * 0.35;
        const leftRumbleXTop = projectedNext.x - projectedNext.w * 0.35;

        ctx.beginPath();
        ctx.moveTo(leftRumbleXTop - rumbleWidthTop / 2, clampedTopY);
        ctx.lineTo(leftRumbleXTop + rumbleWidthTop / 2, clampedTopY);
        ctx.lineTo(leftRumbleXBottom + rumbleWidthBottom / 2, clampedBottomY);
        ctx.lineTo(leftRumbleXBottom - rumbleWidthBottom / 2, clampedBottomY);
        ctx.closePath();
        ctx.fill();

        // Right rumble
        const rightRumbleXBottom = projected.x + projected.w * 0.35;
        const rightRumbleXTop = projectedNext.x + projectedNext.w * 0.35;

        ctx.beginPath();
        ctx.moveTo(rightRumbleXTop - rumbleWidthTop / 2, clampedTopY);
        ctx.lineTo(rightRumbleXTop + rumbleWidthTop / 2, clampedTopY);
        ctx.lineTo(rightRumbleXBottom + rumbleWidthBottom / 2, clampedBottomY);
        ctx.lineTo(rightRumbleXBottom - rumbleWidthBottom / 2, clampedBottomY);
        ctx.closePath();
        ctx.fill();
      }

      // Road edges (solid white) - as trapezoids
      const edgeWidthBottom = Math.max(1, projected.w / 40); // Reduced from /15 to /40 for thinner lines
      const edgeWidthTop = Math.max(1, projectedNext.w / 40); // Reduced from /15 to /40 for thinner lines

      ctx.fillStyle = '#FFFFFF'; // Solid white

      // Left edge
      ctx.beginPath();
      ctx.moveTo(roadLeftTop - edgeWidthTop, clampedTopY);
      ctx.lineTo(roadLeftTop, clampedTopY);
      ctx.lineTo(roadLeft, clampedBottomY);
      ctx.lineTo(roadLeft - edgeWidthBottom, clampedBottomY);
      ctx.closePath();
      ctx.fill();

      // Right edge
      ctx.beginPath();
      ctx.moveTo(roadRightTop, clampedTopY);
      ctx.lineTo(roadRightTop + edgeWidthTop, clampedTopY);
      ctx.lineTo(roadRight + edgeWidthBottom, clampedBottomY);
      ctx.lineTo(roadRight, clampedBottomY);
      ctx.closePath();
      ctx.fill();

      // Draw finish line when close to the end
      const finishLineDistance = 150000;
      const finishLineZ = finishLineDistance - distance;

      // Draw finish line if this segment is at the finish line position
      if (Math.abs(relativeZ - finishLineZ) < SEGMENT_LENGTH) {
        // Calculate position for finish line banner suspended in the air
        const poleHeight = projected.scale * 400; // Height of the poles
        const bannerHeight = projected.scale * 120; // Height of the banner itself
        const bannerTop = projected.y - poleHeight;
        const bannerBottom = bannerTop + bannerHeight;

        // Left and right edges of the road for pole positions
        const leftPoleX = roadLeft - projected.w * 0.05;
        const rightPoleX = roadRight + projected.w * 0.05;
        const poleWidth = Math.max(3, projected.scale * 15);

        // Draw left pole (red)
        ctx.fillStyle = '#CC0000';
        ctx.fillRect(leftPoleX - poleWidth / 2, projected.y - poleHeight, poleWidth, poleHeight);

        // Pole highlight
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(leftPoleX - poleWidth / 2, projected.y - poleHeight, poleWidth * 0.3, poleHeight);

        // Draw right pole (red)
        ctx.fillStyle = '#CC0000';
        ctx.fillRect(rightPoleX - poleWidth / 2, projected.y - poleHeight, poleWidth, poleHeight);

        // Pole highlight
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(rightPoleX - poleWidth / 2, projected.y - poleHeight, poleWidth * 0.3, poleHeight);

        // Draw checkered banner connecting the poles
        const numCheckers = 16; // Number of checker squares across
        const numRows = 3; // Number of rows in the banner
        const checkerWidth = (rightPoleX - leftPoleX) / numCheckers;
        const rowHeight = bannerHeight / numRows;

        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCheckers; col++) {
            // Alternate pattern: offset each row
            const isBlack = (row + col) % 2 === 0;
            ctx.fillStyle = isBlack ? '#000000' : '#FFFFFF';

            const x = leftPoleX + col * checkerWidth;
            const y = bannerTop + row * rowHeight;

            ctx.fillRect(x, y, checkerWidth, rowHeight);
          }
        }

        // Add shadow/depth to banner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(leftPoleX, bannerBottom, rightPoleX - leftPoleX, projected.scale * 8);

        // Draw "FINISH" text on banner if close enough
        if (projected.scale > 0.4) {
          ctx.save();
          ctx.fillStyle = '#FFD700';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.font = `bold ${bannerHeight * 0.5}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const textX = (leftPoleX + rightPoleX) / 2;
          const textY = bannerTop + bannerHeight / 2;
          ctx.strokeText('FINISH', textX, textY);
          ctx.fillText('FINISH', textX, textY);
          ctx.restore();
        }
      }

      // Draw trees on the sides of the road
      // Add trees at irregular intervals using pseudo-random pattern
      const treeSeed = Math.sin(segment.index * 12.9898) * 43758.5453;
      const treeRandom = treeSeed - Math.floor(treeSeed);

      if (treeRandom > 0.85) { // 15% chance for trees to appear (more spaced out)
        const treeScale = projected.scale * 250; // Much larger for trees
        const treeWidth = treeScale;
        const trunkWidth = treeScale * 0.25; // Trunk width
        const trunkHeight = treeScale * 0.8; // Trunk height
        const canopyWidth = treeScale * 1.2; // Canopy width
        const canopyHeight = treeScale * 1.8; // Canopy height

        // Decide which side(s) to draw trees on
        const sideSeed = Math.sin(segment.index * 78.233) * 43758.5453;
        const sideRandom = sideSeed - Math.floor(sideSeed);

        // Left side trees
        if (sideRandom < 0.6 && treeWidth > 3 && canopyHeight > 3) {
          const leftTreeX = projected.x - projected.w * 0.65;

          // Trunk (brown rectangle)
          ctx.fillStyle = '#4a3728'; // Dark brown
          ctx.fillRect(
            leftTreeX - trunkWidth / 2,
            projected.y - trunkHeight,
            trunkWidth,
            trunkHeight
          );

          // Trunk highlight (lighter brown on left side)
          ctx.fillStyle = '#6b4e3d';
          ctx.fillRect(
            leftTreeX - trunkWidth / 2,
            projected.y - trunkHeight,
            trunkWidth * 0.3,
            trunkHeight
          );

          // Canopy (green circles forming tree crown)
          ctx.fillStyle = '#2d5a2d'; // Dark green

          // Main canopy circles
          ctx.beginPath();
          ctx.arc(leftTreeX, projected.y - trunkHeight - canopyHeight * 0.3, canopyWidth * 0.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(leftTreeX - canopyWidth * 0.35, projected.y - trunkHeight - canopyHeight * 0.15, canopyWidth * 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(leftTreeX + canopyWidth * 0.35, projected.y - trunkHeight - canopyHeight * 0.15, canopyWidth * 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(leftTreeX, projected.y - trunkHeight - canopyHeight * 0.6, canopyWidth * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Lighter green highlights on canopy
          ctx.fillStyle = '#3d7f3d';
          ctx.beginPath();
          ctx.arc(leftTreeX - canopyWidth * 0.15, projected.y - trunkHeight - canopyHeight * 0.5, canopyWidth * 0.3, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(leftTreeX + canopyWidth * 0.15, projected.y - trunkHeight - canopyHeight * 0.35, canopyWidth * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }

        // Right side trees
        if (sideRandom > 0.4 && treeWidth > 3 && canopyHeight > 3) {
          const rightTreeX = projected.x + projected.w * 0.65;

          // Trunk (brown rectangle)
          ctx.fillStyle = '#4a3728'; // Dark brown
          ctx.fillRect(
            rightTreeX - trunkWidth / 2,
            projected.y - trunkHeight,
            trunkWidth,
            trunkHeight
          );

          // Trunk highlight (lighter brown on left side)
          ctx.fillStyle = '#6b4e3d';
          ctx.fillRect(
            rightTreeX - trunkWidth / 2,
            projected.y - trunkHeight,
            trunkWidth * 0.3,
            trunkHeight
          );

          // Canopy (green circles forming tree crown)
          ctx.fillStyle = '#2d5a2d'; // Dark green

          // Main canopy circles
          ctx.beginPath();
          ctx.arc(rightTreeX, projected.y - trunkHeight - canopyHeight * 0.3, canopyWidth * 0.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(rightTreeX - canopyWidth * 0.35, projected.y - trunkHeight - canopyHeight * 0.15, canopyWidth * 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(rightTreeX + canopyWidth * 0.35, projected.y - trunkHeight - canopyHeight * 0.15, canopyWidth * 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(rightTreeX, projected.y - trunkHeight - canopyHeight * 0.6, canopyWidth * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Lighter green highlights on canopy
          ctx.fillStyle = '#3d7f3d';
          ctx.beginPath();
          ctx.arc(rightTreeX - canopyWidth * 0.15, projected.y - trunkHeight - canopyHeight * 0.5, canopyWidth * 0.3, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(rightTreeX + canopyWidth * 0.15, projected.y - trunkHeight - canopyHeight * 0.35, canopyWidth * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw obstacles (traffic cones and barriers)
      segment.obstacles.forEach(obs => {
        const spriteScale = projected.scale * 100; // Increased from 80 to 100
        const spriteX = projected.x + (obs.x * projected.w / 2);
        const spriteY = projected.y;
        const spriteW = spriteScale;
        const spriteH = spriteScale * 1.2;

        if (spriteW > 3 && spriteH > 3 && spriteX > 0 && spriteX < CANVAS_WIDTH) {
          if (obs.type === 'cone') {
            // Traffic cone - orange and white stripes
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(spriteX - spriteW * 0.6, spriteY, spriteW * 1.2, 3);

            // Base (black square)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(spriteX - spriteW / 2, spriteY - spriteH * 0.15, spriteW, spriteH * 0.15);

            // Cone body (trapezoid)
            ctx.fillStyle = '#FF6600';
            ctx.beginPath();
            ctx.moveTo(spriteX - spriteW * 0.15, spriteY - spriteH);
            ctx.lineTo(spriteX + spriteW * 0.15, spriteY - spriteH);
            ctx.lineTo(spriteX + spriteW / 2, spriteY - spriteH * 0.15);
            ctx.lineTo(spriteX - spriteW / 2, spriteY - spriteH * 0.15);
            ctx.closePath();
            ctx.fill();

            // White stripe
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(spriteX - spriteW * 0.25, spriteY - spriteH * 0.6);
            ctx.lineTo(spriteX + spriteW * 0.25, spriteY - spriteH * 0.6);
            ctx.lineTo(spriteX + spriteW * 0.35, spriteY - spriteH * 0.4);
            ctx.lineTo(spriteX - spriteW * 0.35, spriteY - spriteH * 0.4);
            ctx.closePath();
            ctx.fill();

            // Cone tip highlight
            ctx.fillStyle = '#FF9944';
            ctx.beginPath();
            ctx.moveTo(spriteX - spriteW * 0.15, spriteY - spriteH);
            ctx.lineTo(spriteX, spriteY - spriteH);
            ctx.lineTo(spriteX + spriteW * 0.25, spriteY - spriteH * 0.15);
            ctx.lineTo(spriteX - spriteW * 0.25, spriteY - spriteH * 0.15);
            ctx.closePath();
            ctx.fill();
          } else {
            // Barrier/barrel - red and white
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(spriteX - spriteW * 0.6, spriteY, spriteW * 1.2, 3);

            // Barrel body
            ctx.fillStyle = '#CC0000';
            ctx.fillRect(spriteX - spriteW / 2, spriteY - spriteH, spriteW, spriteH);

            // White stripes
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(spriteX - spriteW / 2, spriteY - spriteH * 0.8, spriteW, spriteH * 0.15);
            ctx.fillRect(spriteX - spriteW / 2, spriteY - spriteH * 0.4, spriteW, spriteH * 0.15);

            // Barrel highlight (left side)
            ctx.fillStyle = 'rgba(255,100,100,0.5)';
            ctx.fillRect(spriteX - spriteW / 2, spriteY - spriteH, spriteW * 0.25, spriteH);

            // Top rim
            ctx.fillStyle = '#666666';
            ctx.fillRect(spriteX - spriteW / 2, spriteY - spriteH, spriteW, spriteH * 0.1);
          }

          // Collision detection
          if (relativeZ < 500 && gameStarted && !gameOver) {
            const playerScreenX = CANVAS_WIDTH / 2;
            const dist = Math.abs(playerScreenX - spriteX);
            if (dist < (spriteW * 0.5 + 25)) {
              // Play crash sound
              if (!isMuted) {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const playCrashSound = () => {
                // Explosion/crash sound effect
                const duration = 0.5;

                // Noise generator for crash
                const bufferSize = audioContext.sampleRate * duration;
                const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < bufferSize; i++) {
                  data[i] = Math.random() * 2 - 1;
                }

                const noise = audioContext.createBufferSource();
                noise.buffer = buffer;

                const noiseFilter = audioContext.createBiquadFilter();
                noiseFilter.type = 'lowpass';
                noiseFilter.frequency.value = 1000;

                const noiseGain = audioContext.createGain();
                noiseGain.gain.value = 0.5;
                noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(audioContext.destination);

                // Low frequency thump
                const osc = audioContext.createOscillator();
                const oscGain = audioContext.createGain();

                osc.type = 'sine';
                osc.frequency.value = 100;
                osc.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + duration);

                oscGain.gain.value = 0.7;
                oscGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

                osc.connect(oscGain);
                oscGain.connect(audioContext.destination);

                noise.start(audioContext.currentTime);
                noise.stop(audioContext.currentTime + duration);
                osc.start(audioContext.currentTime);
                osc.stop(audioContext.currentTime + duration);
              };

              playCrashSound();
              }
              setGameOver(true);
            }
          }
        }
      });
    }

    // Draw player car using image - positioned on the road using perspective
    // Project the car's position onto the road at a fixed distance from camera
    const carDistance = 10; // Distance from camera in 3D space (lower value = closer to camera = lower on screen)
    const carProjected = project(0, 0, carDistance);

    // Calculate car size - fixed size for consistent appearance
    const carWidth = 190;
    const carHeight = carWidth * 1.5; // Maintain aspect ratio

    // Car is always centered horizontally on canvas
    const carX = CANVAS_WIDTH / 2;
    const carY = CANVAS_HEIGHT - 5; // Fixed position near bottom of canvas

    // Draw car image if loaded (transparent background will be preserved)
    if (carImageRef.current) {
      // Ensure proper compositing for transparency
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(
        carImageRef.current,
        carX - carWidth / 2,
        carY - carHeight,
        carWidth,
        carHeight
      );
    }

  }, [distance, gameStarted, gameOver, project, isMuted]);

  const updateGame = useCallback(() => {
    if (gameOver || !gameStarted) return;

    // Speed control
    let newSpeed = speed;
    if (accelPressed && speed < 250) {
      newSpeed += 1.5; // Slightly more responsive acceleration
    } else if (brakePressed && speed > 0) {
      newSpeed -= 6; // Smoother braking
    } else if (speed > 0) {
      newSpeed -= 0.8; // Slower deceleration
    }
    newSpeed = Math.max(0, Math.min(250, newSpeed));
    setSpeed(newSpeed);

    // Position control - full road width movement
    // Allow movement across almost the entire visible road
    if (leftPressed && playerX.current > -3.5) {
      playerX.current -= 0.12;
    }
    if (rightPressed && playerX.current < 3.5) {
      playerX.current += 0.12;
    }

    // Update distance (move forward) - increased multiplier for faster movement
    const newDistance = distance + newSpeed / 4;
    setDistance(newDistance);

    // Check if reached finish line
    if (newDistance >= 150000) {
      // Play victory sound
      if (!isMuted) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playVictorySound = () => {
        const duration = 3;
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.4;
        masterGain.connect(audioContext.destination);

        // Victory fanfare - celebratory ascending melody
        const victoryNotes = [
          { freq: 523.25, time: 0, duration: 0.12 },      // C
          { freq: 659.25, time: 0.12, duration: 0.12 },   // E
          { freq: 783.99, time: 0.24, duration: 0.12 },   // G
          { freq: 1046.50, time: 0.36, duration: 0.25 },  // C high
          { freq: 987.77, time: 0.65, duration: 0.12 },   // B
          { freq: 1046.50, time: 0.77, duration: 0.12 },  // C high
          { freq: 1174.66, time: 0.89, duration: 0.12 },  // D high
          { freq: 1318.51, time: 1.01, duration: 0.4 },   // E high (sustained)
          { freq: 1318.51, time: 1.5, duration: 0.15 },   // E high repeat
          { freq: 1318.51, time: 1.7, duration: 0.15 },   // E high repeat
          { freq: 1568.00, time: 1.9, duration: 0.6 }     // G high (final sustained)
        ];

        // Main melody with bright tone
        victoryNotes.forEach(note => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.connect(gain);
          gain.connect(masterGain);

          osc.type = 'triangle'; // Brighter, more festive sound
          osc.frequency.value = note.freq;

          gain.gain.value = 0.5;
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.time + note.duration);

          osc.start(audioContext.currentTime + note.time);
          osc.stop(audioContext.currentTime + note.time + note.duration);
        });

        // Harmony layer - follows main melody
        victoryNotes.forEach(note => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.connect(gain);
          gain.connect(masterGain);

          osc.type = 'square';
          osc.frequency.value = note.freq * 0.75; // Perfect fifth below

          gain.gain.value = 0.25;
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.time + note.duration);

          osc.start(audioContext.currentTime + note.time);
          osc.stop(audioContext.currentTime + note.time + note.duration);
        });

        // Celebration sparkles - more intense
        for (let i = 0; i < 15; i++) {
          const sparkle = audioContext.createOscillator();
          const sparkleGain = audioContext.createGain();

          sparkle.connect(sparkleGain);
          sparkleGain.connect(masterGain);

          sparkle.type = 'sine';
          sparkle.frequency.value = 1500 + Math.random() * 1500;

          sparkleGain.gain.value = 0.2;
          sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

          sparkle.start(audioContext.currentTime + i * 0.15);
          sparkle.stop(audioContext.currentTime + i * 0.15 + 0.3);
        }

        // Drum roll effect for celebration
        for (let i = 0; i < 10; i++) {
          const kick = audioContext.createOscillator();
          const kickGain = audioContext.createGain();

          kick.connect(kickGain);
          kickGain.connect(masterGain);

          kick.type = 'sine';
          kick.frequency.value = 80;
          kick.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + i * 0.08 + 0.05);

          kickGain.gain.value = 0.3;
          kickGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.08 + 0.08);

          kick.start(audioContext.currentTime + i * 0.08);
          kick.stop(audioContext.currentTime + i * 0.08 + 0.08);
        }

        // Final cymbal crash effect
        const bufferSize = audioContext.sampleRate * 1;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioContext.sampleRate * 0.3));
        }

        const cymbal = audioContext.createBufferSource();
        cymbal.buffer = buffer;

        const cymbalFilter = audioContext.createBiquadFilter();
        cymbalFilter.type = 'highpass';
        cymbalFilter.frequency.value = 3000;

        const cymbalGain = audioContext.createGain();
        cymbalGain.gain.value = 0.4;
        cymbalGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

        cymbal.connect(cymbalFilter);
        cymbalFilter.connect(cymbalGain);
        cymbalGain.connect(audioContext.destination);

        cymbal.start(audioContext.currentTime + 0.36);
      };

      playVictorySound();
      }
      setReachedFinish(true);
      setShowVictory(true);
      setGameOver(true);
    }

    // Recycle segments: when they pass the camera, move them to the end
    roadSegments.current.forEach(segment => {
      const relativeZ = segment.z - newDistance;

      // If segment is behind camera, recycle it to the end
      if (relativeZ < -SEGMENT_LENGTH) {
        // Find the furthest segment
        const maxZ = Math.max(...roadSegments.current.map(s => s.z));
        segment.z = maxZ + SEGMENT_LENGTH;
        segment.index = Math.floor(segment.z / SEGMENT_LENGTH);

        // Update curve based on segment index position
        const i = segment.index;
        let segmentCurve = 0;
        if (i > 100 && i < 200) {
          segmentCurve = 0.003;
        } else if (i > 250 && i < 350) {
          segmentCurve = -0.003;
        } else if (i > 400 && i < 480) {
          segmentCurve = 0.004;
        } else if (i > 550 && i < 650) {
          segmentCurve = -0.002;
        }
        segment.curve = segmentCurve;

        // Randomly add new obstacles across the entire road
        segment.obstacles = [];
        if (Math.random() < 0.25) {
          const x = (Math.random() - 0.5) * 1.8;
          segment.obstacles.push({
            x: x,
            type: Math.random() > 0.5 ? 'cone' : 'barrel'
          });
        }
      }
    });

  }, [speed, accelPressed, brakePressed, leftPressed, rightPressed, gameStarted, gameOver, distance, isMuted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted && !gameOver && ['ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setGameStarted(true);
      }

      if (gameOver && e.key === 'Enter') {
        // Reset all game state
        setDistance(0);
        setSpeed(0);
        playerX.current = 0;
        roadCurve.current = 0;
        setReachedFinish(false);
        setShowVictory(false);

        // Reinitialize road segments
        const segments: RoadSegment[] = [];
        const numSegments = 300;

        for (let i = 0; i < numSegments; i++) {
          const obstacles: Array<{ x: number; type: string }> = [];

          // Add obstacles randomly across the entire road
          if (i > 20 && Math.random() < 0.25) {
            const x = (Math.random() - 0.5) * 1.8;
            obstacles.push({
              x: x,
              type: Math.random() > 0.5 ? 'cone' : 'barrel'
            });
          }

          // Add progressive curves based on position
          let segmentCurve = 0;
          if (i > 100 && i < 200) {
            segmentCurve = 0.003;
          } else if (i > 250 && i < 350) {
            segmentCurve = -0.003;
          } else if (i > 400 && i < 480) {
            segmentCurve = 0.004;
          } else if (i > 550 && i < 650) {
            segmentCurve = -0.002;
          }

          segments.push({
            index: i,
            z: i * SEGMENT_LENGTH,
            curve: segmentCurve,
            color: Math.floor(i / 3) % 2 === 0 ? '#666' : '#888',
            obstacles
          });
        }
        roadSegments.current = segments;

        setGameOver(false);
        setGameStarted(false);
      }

      if (e.key === 'Escape') {
        router.push('/');
        return;
      }

      e.preventDefault();
      if (e.key === 'ArrowLeft') setLeftPressed(true);
      if (e.key === 'ArrowRight') setRightPressed(true);
      if (e.key === 'ArrowUp') setAccelPressed(true);
      if (e.key === 'ArrowDown') setBrakePressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setLeftPressed(false);
      if (e.key === 'ArrowRight') setRightPressed(false);
      if (e.key === 'ArrowUp') setAccelPressed(false);
      if (e.key === 'ArrowDown') setBrakePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [router, gameOver, gameStarted]);

  // Game loop using requestAnimationFrame
  useEffect(() => {
    let lastTime = 0;
    const fps = 60;
    const frameInterval = 1000 / fps;

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameInterval) {
        updateGame();
        draw();
        lastTime = currentTime - (deltaTime % frameInterval);
      }

      animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [updateGame, draw]);

  if (showDialog) {
    return (
      <GameDialog
        stepNumber={8}
        stepName="Step 8"
        skillName="Speed & Reflexes"
        alertTitle="Hay una diferencia entre una PSICO, y una PSYCO..."
        description="Para saber cual sos, manejá la Toyineta hasta la meta. Tené cuidado con los obstáculos."
        onStart={() => setShowDialog(false)}
        onBack={() => router.push('/')}
        imageUrl="/pisteando.jpg"
        hideHeader={true}
      />
    );
  }

  if (showVictory) {
    // Check if minigames mode is active
    const minigamesMode = typeof window !== 'undefined'
      ? localStorage.getItem('minigamesMode') === 'true'
      : false;

    // In minigames mode, go to menu instead of video
    const nextPath = minigamesMode ? '/' : '/video';

    return <VictoryDialog nextGamePath={nextPath} levelNumber={5} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameWrapper}>
        <h1 className={styles.title}>RETRO RACER</h1>

        <div className={styles.gameArea}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={styles.gameCanvas}
          />

          <div className={styles.statsContainer}>
            <div className={styles.scoreBox}>
              <h3>DISTANCIA</h3>
              <p className={styles.scoreValue}>{Math.floor(distance)}m</p>
            </div>
            <div className={styles.scoreBox}>
              <h3>VELOCIDAD</h3>
              <p className={styles.scoreValue}>{Math.floor(speed)} km/h</p>
            </div>
            <button
              className={styles.muteButton}
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {!gameStarted && !gameOver && (
          <div className={styles.startOverlay}>
            <div className={styles.startBox}>
              <h2>LISTO?</h2>
              <p className={styles.instruction}>PRESIONA CUALQUIER FLECHA PARA COMENZAR</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className={styles.gameOverOverlay}>
            <div className={styles.gameOverBox}>
              {reachedFinish ? (
                <>
                  <h2>🏁 ¡FELICITACIONES! 🏁</h2>
                  <p className={styles.finalScore}>¡Completaste el recorrido!</p>
                  <p className={styles.finalScore}>DISTANCIA: {Math.floor(distance)}m</p>
                  <p className={styles.instruction} style={{ color: '#FF1493', fontSize: '1.2em', marginTop: '20px' }}>
                    Ahora estás autorizada a manejar 😂
                  </p>
                </>
              ) : (
                <>
                  <img src="/triste.jpg" alt="sad" className={styles.sadImage} />
                  <h2>Perdiste! :(</h2>
                  <p className={styles.finalScore}>DISTANCIA: {Math.floor(distance)}m</p>
                </>
              )}
              <p className={styles.instruction}>PRESS ENTER TO PLAY AGAIN</p>
              <p className={styles.instruction}>PRESS ESC FOR MENU</p>
            </div>
          </div>
        )}

        <div className={styles.controls}>
          <p>← → ARROWS TO STEER | ↑ ACCELERATE | ↓ BRAKE | ESC MENU</p>
          <p>AVOID OBSTACLES AND DRIVE AS FAR AS YOU CAN!</p>
        </div>
      </div>
    </div>
  );
}
