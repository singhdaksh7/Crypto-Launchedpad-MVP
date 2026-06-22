import React from 'react';
import { Icon } from '../ui/Icon';

interface ActivityItem {
  type: 'deploy' | 'presale' | 'buy' | 'withdraw';
  wallet: string;
  msg: string;
  time: string;
}

const mockActivities: ActivityItem[] = [
  {
    type: 'deploy',
    wallet: '0x32FD...e74b',
    msg: 'Deployed standard BEP-20 token',
    time: '2 mins ago',
  },
  {
    type: 'presale',
    wallet: '0x32FD...e74b',
    msg: 'Initiated presale for token MAT',
    time: '5 mins ago',
  },
  {
    type: 'buy',
    wallet: '0x91cA...830d',
    msg: 'Contributed 2.5 BNB to presale #4',
    time: '12 mins ago',
  },
  {
    type: 'withdraw',
    wallet: '0x7e2B...a891',
    msg: 'Withdrew raised funds from presale #2',
    time: '1 hour ago',
  },
];

export const ActivityFeed: React.FC = () => {
  return (
    <div className="card space-y-4">
      <h3 className="text-xs uppercase tracking-wider text-ink-500 font-bold mb-2">Recent Platform Activity</h3>
      <div className="divide-y divide-white/5 space-y-4">
        {mockActivities.map((act, idx) => {
          const icon = act.type === 'deploy' ? 'plus' : act.type === 'presale' ? 'rocket' : act.type === 'buy' ? 'wallet' : 'check';
          const iconColor = act.type === 'deploy' ? 'text-sky-400 bg-sky-400/10' : act.type === 'presale' ? 'text-bnb-text bg-bnb/10' : act.type === 'buy' ? 'text-emerald-400 bg-emerald-400/10' : 'text-purple-400 bg-purple-400/10';

          return (
            <div key={idx} className="flex gap-3 pt-4 first:pt-0">
              <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                <Icon name={icon as any} size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-medium leading-relaxed">
                  <span className="font-mono text-ink-400 font-semibold">{act.wallet}</span> {act.msg}
                </p>
                <span className="text-[10px] text-ink-500 font-semibold mt-0.5 block">{act.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ActivityFeed;
