"use client";

import { useState } from "react";
import {
  useFloating,
  useHover,
  useFocus,
  useClick,
  useDismiss,
  useInteractions,
  useTransitionStyles,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  FloatingArrow,
  FloatingPortal,
  type Placement,
} from "@floating-ui/react";

interface TooltipProps {
  content: React.ReactNode;
  placement?: Placement;
  /** Show on click instead of hover */
  clickMode?: boolean;
  children: React.ReactNode;
}

export function Tooltip({
  content,
  placement = "top",
  clickMode = false,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  // Callback-ref so arrow() receives the DOM node (not a ref object),
  // avoiding the "cannot access refs during render" diagnostic.
  const [arrowEl, setArrowEl] = useState<SVGSVGElement | null>(null);

  const { refs: { setReference, setFloating }, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    strategy: "fixed",
    // Disable transform-based positioning so floatingStyles uses top/left.
    // useTransitionStyles also injects a `transform` (for the scale animation)
    // which would otherwise overwrite the translate() Floating UI uses to
    // position the element, collapsing it to (0, 0).
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 6 }),
      arrow({ element: arrowEl }),
    ],
  });

  const hover = useHover(context, { enabled: !clickMode });
  const focus = useFocus(context, { enabled: !clickMode });
  const click = useClick(context, { enabled: clickMode });
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    click,
    dismiss,
  ]);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 150,
    initial: { opacity: 0, transform: "scale(0.95)" },
  });

  return (
    <>
      <span ref={setReference} {...getReferenceProps()}>
        {children}
      </span>

      {isMounted && (
        <FloatingPortal>
          <div
            ref={setFloating}
            style={{ ...floatingStyles, ...transitionStyles }}
            {...getFloatingProps()}
            className="z-50 rounded bg-neutral text-neutral-content text-xs px-2 py-1 shadow-md pointer-events-none"
          >
            {content}
            <FloatingArrow
              ref={setArrowEl}
              context={context}
              className="fill-neutral"
              width={10}
              height={5}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
