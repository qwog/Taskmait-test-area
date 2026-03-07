import { Trophy, Star, Medal } from 'lucide-react';
import { HouseholdMember } from '../types';

interface Props {
  members: HouseholdMember[];
  currentUserId: string;
}

const RANK_COLORS = [
  'bg-gradient-to-r from-yellow-400 to-amber-400 text-white',
  'bg-gradient-to-r from-gray-300 to-gray-400 text-white',
  'bg-gradient-to-r from-orange-400 to-amber-600 text-white',
];

const RANK_ICONS = [
  <Trophy key="1" className="w-4 h-4" />,
  <Medal key="2" className="w-4 h-4" />,
  <Medal key="3" className="w-4 h-4" />,
];

export default function Leaderboard({ members, currentUserId }: Props) {
  const sorted = [...members].sort((a, b) => b.household_points - a.household_points);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold">Leaderboard</h3>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {sorted.map((member, i) => (
          <div
            key={member.id}
            className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
              member.id === currentUserId ? 'bg-brand-50 dark:bg-brand-900/20' : ''
            }`}
          >
            {/* Rank */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < 3 ? RANK_COLORS[i] : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            }`}>
              {i < 3 ? RANK_ICONS[i] : i + 1}
            </div>

            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: member.avatar_color }}
            >
              {member.username[0].toUpperCase()}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {member.username}
                {member.id === currentUserId && (
                  <span className="ml-1.5 text-xs text-brand-500 font-normal">(you)</span>
                )}
              </p>
            </div>

            {/* Points */}
            <div className="points-pill shrink-0">
              <Star className="w-3 h-3 fill-current" />
              {member.household_points.toLocaleString()}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            No activity yet. Complete some tasks to appear here!
          </div>
        )}
      </div>
    </div>
  );
}
