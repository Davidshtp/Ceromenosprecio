import { useEffect } from "react";

let scrollLockCount = 0;
let savedScrollPosition = 0;
let savedHorizontalScrollPosition = 0;
let savedHtmlOverflow = "";
let savedHtmlScrollBehavior = "";
let savedBodyStyles: Pick<
  CSSStyleDeclaration,
  "overflow" | "position" | "top" | "left" | "width"
> | null = null;

export const useScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;

    scrollLockCount += 1;
    if (scrollLockCount === 1) {
      const { body, documentElement } = document;
      savedScrollPosition = window.scrollY;
      savedHorizontalScrollPosition = window.scrollX;
      savedHtmlOverflow = documentElement.style.overflow;
      savedHtmlScrollBehavior = documentElement.style.scrollBehavior;
      savedBodyStyles = {
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        width: body.style.width,
      };

      documentElement.style.overflow = "hidden";
      documentElement.style.scrollBehavior = "auto";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${savedScrollPosition}px`;
      body.style.left = `-${savedHorizontalScrollPosition}px`;
      body.style.width = "100%";
    }

    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount !== 0 || !savedBodyStyles) return;

      const { body, documentElement } = document;
      body.style.overflow = savedBodyStyles.overflow;
      body.style.position = savedBodyStyles.position;
      body.style.top = savedBodyStyles.top;
      body.style.left = savedBodyStyles.left;
      body.style.width = savedBodyStyles.width;
      documentElement.style.overflow = savedHtmlOverflow;
      window.scrollTo({
        top: savedScrollPosition,
        left: savedHorizontalScrollPosition,
        behavior: "auto",
      });
      documentElement.style.scrollBehavior = savedHtmlScrollBehavior;
      savedBodyStyles = null;
    };
  }, [isLocked]);
};
