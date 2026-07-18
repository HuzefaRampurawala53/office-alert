import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

export default function SplitText({
  text = "",
  className = "",
  delay = 50, // in ms
  duration = 1.0,
  ease = "easeOut",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onLetterAnimationComplete,
}) {
  const letters = text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (currentRef) {
            observer.unobserve(currentRef);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin]);

  // Map GSAP ease names to framer-motion/motion ease if needed, e.g. "power3.out" -> [0.215, 0.610, 0.355, 1.000]
  const getEase = (easeName) => {
    if (easeName === "power3.out") return [0.215, 0.61, 0.355, 1];
    return easeName;
  };

  const animatedEase = getEase(ease);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        display: "inline-block",
        textAlign: textAlign,
        whiteSpace: "pre-wrap",
      }}
    >
      {letters.map((char, index) => {
        return (
          <motion.span
            key={index}
            style={{ display: "inline-block" }}
            initial={from}
            animate={inView ? to : from}
            transition={{
              delay: (index * delay) / 1000,
              duration: duration,
              ease: animatedEase,
            }}
            onAnimationComplete={() => {
              if (index === letters.length - 1 && onLetterAnimationComplete) {
                onLetterAnimationComplete();
              }
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        );
      })}
    </span>
  );
}
