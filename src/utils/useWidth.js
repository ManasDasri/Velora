import { useEffect, useRef, useState } from "react";

// Width of an element, kept current as the layout changes. Charts use it to draw at real pixel size.
export default function useWidth(initial = 800) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
