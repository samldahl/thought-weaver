import { useEffect, useState } from 'react';

interface ThoughtBubble {
  id: number;
  text: string;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}

const THOUGHT_SAMPLES = [
  "Did I leave the oven on?",
  "Why do we park in driveways and drive on parkways?",
  "Is a hotdog a sandwich?",
  "What if my dog thinks I'm the pet?",
  "Do crabs think fish can fly?",
  "Is cereal a soup?",
  "Why is abbreviated such a long word?",
  "Do fish get thirsty?",
  "What if pigeons are actually government drones?",
  "Can you cry underwater?",
  "Why don't we fall off the Earth?",
  "Is mayonnaise an instrument?",
  "Do stairs go up or down?",
  "Why do noses run and feet smell?",
  "What if the hokey pokey IS what it's all about?",
  "Do penguins have knees?",
  "Can you daydream at night?",
  "Why is it called a building if it's already built?",
  "Do zombies get brain freeze?",
  "Is the 'S' or 'C' silent in 'scent'?"
];

const PASTEL_COLORS = [
  "rgb(255, 182, 193)", // light pink
  "rgb(173, 216, 230)", // light blue
  "rgb(221, 160, 221)", // plum
  "rgb(176, 224, 230)", // powder blue
  "rgb(255, 218, 185)", // peach
  "rgb(230, 230, 250)", // lavender
  "rgb(255, 239, 213)", // papaya whip
  "rgb(255, 228, 225)", // misty rose
  "rgb(240, 230, 140)", // khaki
  "rgb(216, 191, 216)", // thistle
];

const getRandomItem = <T,>(array: T[]): T => 
  array[Math.floor(Math.random() * array.length)];

const generateBubbles = (count: number): ThoughtBubble[] => 
  Array.from({ length: count }, (_, i) => ({
    id: i,
    text: getRandomItem(THOUGHT_SAMPLES),
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 80 + Math.random() * 140,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 8,
    color: getRandomItem(PASTEL_COLORS),
  }));

const rgbToRgba = (rgb: string, alpha: number): string => 
  rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`);

interface ThoughtBubbleBackgroundProps {
  bubbleCount?: number;
}

export function ThoughtBubbleBackground({ bubbleCount = 15 }: ThoughtBubbleBackgroundProps) {
  const [bubbles, setBubbles] = useState<ThoughtBubble[]>([]);

  useEffect(() => {
    setBubbles(generateBubbles(bubbleCount));
  }, [bubbleCount]);

  return (
    <>
      <div className="absolute inset-0 pointer-events-none">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute rounded-full backdrop-blur-sm flex items-center justify-center"
            style={{
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              animation: `growBubble ${bubble.duration}s ease-in-out ${bubble.delay}s infinite`,
              fontSize: `${Math.max(bubble.size / 12, 10)}px`,
              backgroundColor: `${bubble.color}20`,
              border: `1px solid ${bubble.color}40`,
              color: rgbToRgba(bubble.color, 0.7),
            }}
          >
            <span className="font-light px-3 text-center leading-tight">
              {bubble.text}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes growBubble {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
}
