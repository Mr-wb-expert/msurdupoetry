import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * A router change does not reset the scroll position, so a reader who follows
 * a link lands halfway down the previous page. Restoring to the top on every
 * navigation is the behaviour the back button already has natively.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}