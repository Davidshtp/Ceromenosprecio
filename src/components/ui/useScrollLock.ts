import { useEffect } from "react";

let scrollLockCount = 0;
let savedScrollPosition = 0;
let savedHtmlOverflow = "";
let savedBodyStyles: Pick<
  CSSStyleDeclaration,
  "overflow" | "position" | "top" | "width"
> | null = null;

export const useScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;

    scrollLockCount += 1;
    if (scrollLockCount === 1) {
      const { body, documentElement } = document;
      savedScrollPosition = window.scrollY;
      savedHtmlOverflow = documentElement.style.overflow;
      savedBodyStyles = {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
      };

      documentElement.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${savedScrollPosition}px`;
      body.style.width = "100%";
    }

    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount !== 0 || !savedBodyStyles) return;

      const { body, documentElement } = document;
      documentElement.style.overflow = savedHtmlOverflow;
      body.style.overflow = savedBodyStyles.overflow;
      body.style.position = savedBodyStyles.position;
      body.style.top = savedBodyStyles.top;
      body.style.width = savedBodyStyles.width;
      window.scrollTo(0, savedScrollPosition);
      savedBodyStyles = null;
    };
  }, [isLocked]);
};
