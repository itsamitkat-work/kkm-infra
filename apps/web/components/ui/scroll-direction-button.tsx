"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ScrollDirection = "up" | "down";

interface ScrollDirectionButtonProps {
  getContainer: () => HTMLElement | null;
  idleHideMs?: number;
  className?: string;
  positionClassName?: string;
}

export function ScrollDirectionButton({
  getContainer,
  idleHideMs = 900,
  className,
  positionClassName = "absolute bottom-3 right-3",
}: ScrollDirectionButtonProps) {
  const [visible, setVisible] = React.useState(false);
  const [direction, setDirection] = React.useState<ScrollDirection>("down");
  const lastTopRef = React.useRef(0);
  const hideTimerRef = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const container = getContainer();
    if (!container) return;
    containerRef.current = container;

    // Initialize lastTop
    lastTopRef.current = container.scrollTop;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const newDirection: ScrollDirection =
        scrollTop > lastTopRef.current ? "down" : "up";
      lastTopRef.current = scrollTop;

      // Only show while actively scrolling and when content is scrollable
      const isScrollable = scrollHeight > clientHeight + 8;
      if (!isScrollable) return;

      setDirection(newDirection);
      setVisible(true);

      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
      }, idleHideMs);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [getContainer, idleHideMs]);

  if (!visible) return null;

  return (
    <Button
      aria-label={direction === "down" ? "Scroll to bottom" : "Scroll to top"}
      size="sm"
      className={cn(
        positionClassName,
        "h-8 w-8 p-0 rounded-full shadow-md",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
      onClick={() => {
        const container = containerRef.current ?? getContainer();
        if (!container) return;
        const { scrollHeight } = container;
        const targetTop = direction === "down" ? scrollHeight : 0;
        container.scrollTo({ top: targetTop, behavior: "smooth" });
      }}
    >
      {direction === "down" ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronUp className="h-4 w-4" />
      )}
    </Button>
  );
}

export default ScrollDirectionButton;
