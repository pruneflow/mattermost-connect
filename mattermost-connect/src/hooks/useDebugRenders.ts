import { useRef, useEffect } from "react";

export function useDebugRenders(componentName: string, props: any) {
  const renderCount = useRef(0);
  const prevProps = useRef<any>({});

  useEffect(() => {
    renderCount.current += 1;

    // Analyser ce qui a changé pour causer ce rendu
    const changedProps: string[] = [];
    Object.entries(props).forEach(([key, value]) => {
      if (prevProps.current[key] !== value) {
        changedProps.push(key);
      }
    });

    console.debug(
      `[${componentName}] render #${renderCount.current}`,
      changedProps.length > 0
        ? `Changed props: ${changedProps.join(", ")}`
        : "No props changed",
    );

    prevProps.current = { ...props };
  });
}
