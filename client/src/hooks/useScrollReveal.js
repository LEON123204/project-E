import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook to detect when an element is in the viewport.
 * @param {Object} options - IntersectionObserver configurations.
 * @returns {Array} [React.RefObject, boolean]
 */
export const useScrollReveal = (options = { threshold: 0.1, triggerOnce: true }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (options.triggerOnce) {
            observer.disconnect();
          }
        } else if (!options.triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold: options.threshold }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [options.threshold, options.triggerOnce]);

  return [elementRef, isVisible];
};

export default useScrollReveal;
