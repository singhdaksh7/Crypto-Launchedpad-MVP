import React from 'react';

interface KeyValueItem {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: string;
}

interface KeyValueListProps {
  items: KeyValueItem[];
  className?: string;
}

export const KeyValueList: React.FC<KeyValueListProps> = ({ items, className = '' }) => {
  return (
    <div className={`divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden bg-black/10 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center px-4 py-3 text-sm">
          <div>
            <span className="text-ink-400 font-medium block">{item.label}</span>
            {item.hint && <span className="text-[10px] text-ink-500">{item.hint}</span>}
          </div>
          <div className="text-right text-white font-mono font-medium">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
};
export default KeyValueList;
