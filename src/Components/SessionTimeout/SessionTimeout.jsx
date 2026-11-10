import { useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios";

const LAST_ACTIVITY_KEY = "futurELastActivity";
const INACTIVITY_LIMIT = 30 * 60 * 1000;

export default function SessionTimeout({ children }) {
  useEffect(() => {
    let timeout;
    const logout = () => {
      Cookies.remove("userData");
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      delete axios.defaults.headers.common.Authorization;
      window.location.replace("/");
    };
    const reset = () => {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      if (lastActivity && Date.now() - lastActivity >= INACTIVITY_LIMIT) {
        logout();
        return;
      }
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      window.clearTimeout(timeout);
      timeout = window.setTimeout(logout, INACTIVITY_LIMIT);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    const handleActivity = () => reset();
    const handleStorage = (event) => {
      if (event.key !== LAST_ACTIVITY_KEY) return;
      if (!event.newValue || Date.now() - Number(event.newValue) >= INACTIVITY_LIMIT) {
        logout();
        return;
      }
      window.clearTimeout(timeout);
      timeout = window.setTimeout(logout, INACTIVITY_LIMIT);
    };
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    window.addEventListener("storage", handleStorage);
    reset();
    return () => {
      window.clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
  return children;
}
