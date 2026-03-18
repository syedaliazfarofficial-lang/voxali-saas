import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Clock } from 'lucide-react';

// 60 minutes in milliseconds
const TIMEOUT_DURATION = 60 * 60 * 1000; 

// Events that count as "activity"
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

export function SessionTimeout() {
  const { user, forceLogout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);

  // Restart the timers whenever user is active
  const resetTimer = () => {
    // Hide warning if they come back to life before full timeout
    if (showWarning) setShowWarning(false);

    // Clear existing timers
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (warningRef.current) window.clearTimeout(warningRef.current);

    // Only run if user is logged in
    if (!user) return;

    // Set a warning to show 1 minute BEFORE forced logout
    warningRef.current = window.setTimeout(() => {
      setShowWarning(true);
    }, TIMEOUT_DURATION - 60000); // Ex: 59th minute

    // Set the actual hard logout timer
    timeoutRef.current = window.setTimeout(async () => {
      await performLogout();
    }, TIMEOUT_DURATION);
  };

  const performLogout = async () => {
    console.log("Session timed out due to inactivity");
    
    // Nuclear clear all supabase localStorage to prevent ghost sessions
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('voxali'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    await forceLogout();
    
    // Instead of forcing a hard refresh to the root which might be the dashboard,
    // let's send them explicitly to the planned login location if we unify routes,
    // but right now standard auth state handles it. We can just alert.
    alert("You have been automatically logged out due to 60 minutes of inactivity.");
    window.location.reload();
  };

  // Attach event listeners when component mounts
  useEffect(() => {
    if (!user) return;

    // Initial setup
    resetTimer();

    // Attach listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Cleanup listeners on unmount
    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (warningRef.current) window.clearTimeout(warningRef.current);
    };
  }, [user]); // Re-bind if user session changes

  if (!showWarning || !user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl shadow-2xl animate-fade-in backdrop-blur-md flex items-start gap-4">
      <div className="bg-red-500/20 p-2 rounded-full mt-1">
        <Clock className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Session Expiring Soon
        </h3>
        <p className="text-sm mt-1 opacity-90 text-red-400">
          You have been inactive for a while. You will be automatically logged out in 1 minute to protect your account. Move your mouse or click anywhere to stay logged in.
        </p>
      </div>
    </div>
  );
}
