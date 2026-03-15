"use client";
import { useEffect, useState } from "react";

interface TypeWriterProps {
  texts: string[];
  speed?: number;
  deleteSpeed?: number;
  pauseTime?: number;
}

const TypeWriter = ({ texts, speed = 60, deleteSpeed = 30, pauseTime = 2000 }: TypeWriterProps) => {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];

    if (isPausing) {
      const pause = setTimeout(() => {
        setIsPausing(false);
        setIsDeleting(true);
      }, pauseTime);
      return () => clearTimeout(pause);
    }

    if (!isDeleting) {
      if (displayText.length < current.length) {
        const t = setTimeout(() => {
          setDisplayText(current.slice(0, displayText.length + 1));
        }, speed);
        return () => clearTimeout(t);
      } else {
        setIsPausing(true);
      }
    } else {
      if (displayText.length > 0) {
        const t = setTimeout(() => {
          setDisplayText(current.slice(0, displayText.length - 1));
        }, deleteSpeed);
        return () => clearTimeout(t);
      } else {
        setIsDeleting(false);
        setTextIndex((prev) => (prev + 1) % texts.length);
      }
    }
  }, [displayText, isDeleting, isPausing, textIndex, texts, speed, deleteSpeed, pauseTime]);

  return (
    <span className="text-highlight font-mono">
      {displayText}
      <span className="animate-blink">|</span>
    </span>
  );
};

export default TypeWriter;