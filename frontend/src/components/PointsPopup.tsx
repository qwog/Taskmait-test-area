import { useEffect, useState } from 'react';
import { Star, Flame, Zap } from 'lucide-react';
import { CompletionResult } from '../types';

interface Props {
  result: CompletionResult | null;
  onDone: () => void;
}

export default function PointsPopup({ result, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 300);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [result, onDone]);

  if (!result) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Popup */}
      <div className={`relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center max-w-sm mx-4 transition-transform duration-300 ${visible ? 'animate-bounce-in' : 'scale-75'}`}>
        {/* Celebration icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Star className="w-10 h-10 text-white fill-current" />
        </div>

        <h2 className="text-2xl font-bold mb-1">Task Complete!</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Great work! Here's what you earned:</p>

        {/* Points breakdown */}
        <div className="space-y-2 mb-5">
          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Base Points</span>
            <span className="font-bold text-brand-600 dark:text-brand-400">+{result.base_points}</span>
          </div>
          {result.bonus_points > 0 && (
            <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/30 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Speed Bonus
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">+{result.bonus_points}</span>
            </div>
          )}
          {result.streak_bonus > 0 && (
            <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Streak Bonus
              </span>
              <span className="font-bold text-red-600 dark:text-red-400">+{result.streak_bonus}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-gradient-to-r from-brand-500 to-purple-500 rounded-2xl p-4 text-white">
          <p className="text-sm opacity-80 mb-0.5">Total Earned</p>
          <p className="text-4xl font-black">+{result.points_earned}</p>
          <p className="text-sm opacity-80 mt-0.5">points</p>
        </div>

        {result.new_streak > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2 text-orange-500">
            <Flame className="w-5 h-5" />
            <span className="font-bold">{result.new_streak} day streak! 🔥</span>
          </div>
        )}
      </div>
    </div>
  );
}
