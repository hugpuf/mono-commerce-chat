import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ 
  options, 
  value, 
  onChange, 
  className 
}: SegmentedControlProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Small delay to ensure DOM has rendered and refs are available
    const timer = setTimeout(() => {
      const selectedIndex = options.findIndex(opt => opt.value === value);
      const selectedButton = buttonRefs.current[selectedIndex];
      
      if (selectedButton) {
        setIndicatorStyle({
          left: selectedButton.offsetLeft,
          width: selectedButton.offsetWidth,
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [value, options]);

  return (
    <div 
      className={cn(
        "relative inline-flex items-center gap-0 p-1 rounded-xl bg-secondary border border-border",
        className
      )}
    >
      {/* Sliding indicator */}
      <div
        className="absolute top-1 bottom-1 bg-accent rounded-lg transition-all duration-200 ease-out shadow-sm"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />
      
      {/* Segments */}
      {options.map((option, index) => {
        const isSelected = option.value === value;
        
        return (
          <button
            key={option.value}
            ref={el => buttonRefs.current[index] = el}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-150",
              isSelected 
                ? "text-accent-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn(
              "flex-shrink-0 transition-colors duration-150",
              isSelected ? "text-accent-foreground" : "text-muted-foreground"
            )}>
              {option.icon}
            </span>
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
