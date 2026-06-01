import React, { type ReactNode } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  isUrgent?: boolean;
  linkText: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, value, icon, trend, isUrgent, linkText 
}) => {
  return (
    <div className={`rounded-[2rem] p-6 border transition-all duration-300 hover:shadow-md relative overflow-hidden ${
      isUrgent 
        ? 'bg-gradient-to-br from-[#F3A939] to-[#E8961E] border-transparent shadow-lg shadow-orange-100' 
        : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`p-2.5 rounded-xl flex items-center justify-center ${
          isUrgent ? 'bg-white/20 text-white' : 'bg-[#F3EDF9] text-[#A989C8]'
        }`}>
          {icon}
        </div>
        
        {isUrgent ? (
          <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-1 rounded uppercase tracking-wider">
            Urgent
          </span>
        ) : (
          trend && (
            <span className="text-green-500 text-xs font-bold flex items-center gap-1">
              <TrendingUp size={12} /> {trend}
            </span>
          )
        )}
      </div>

      <h2 className={`text-3xl font-bold mb-1 ${isUrgent ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </h2>
      <p className={`text-sm mb-4 font-medium ${isUrgent ? 'text-white/80' : 'text-gray-500'}`}>
        {title}
      </p>

      <button className={`text-xs font-bold flex items-center gap-1 group transition-all ${
        isUrgent ? 'text-white hover:opacity-80' : 'text-[#A989C8] hover:gap-2'
      }`}>
        {linkText} <ChevronRight size={14} />
      </button>
    </div>
  );
};

interface ListCardItem {
  label: string;
  value: string | number;
  color?: string;
}

interface ListCardProps {
  title: string;
  icon: ReactNode;
  items: ListCardItem[];
}

export const ListCard: React.FC<ListCardProps> = ({ title, icon, items }) => (
  <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
    <div className="flex items-center gap-2 mb-6">
      <div className="text-[#A989C8]">{icon}</div>
      <span className="text-gray-800 font-bold text-base">{title}</span>
    </div>
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center p-3 bg-gray-50/50 rounded-xl border border-gray-50">
          <span className="text-sm font-medium text-gray-500">{item.label}</span>
          <span className={`text-lg font-bold ${item.color || 'text-gray-900'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

interface ActionCardProps {
  title: string;
  subtext: string;
  icon: ReactNode;
  iconBg: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({ title, subtext, icon, iconBg }) => (
  <button className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 hover:border-[#A989C8] hover:bg-[#F3EDF9]/30 transition-all text-left group w-full">
    <div className={`${iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform flex items-center justify-center shadow-sm`}>
      {icon}
    </div>
    <div className="overflow-hidden">
      <h5 className="text-sm font-bold text-gray-900 truncate">{title}</h5>
      <p className="text-[11px] text-gray-400 font-medium truncate">{subtext}</p>
    </div>
  </button>
);

export const MetricCard: React.FC<{ title: string; value: string; icon: ReactNode; color: string; bg: string }> = ({ 
  title, value, icon, color, bg 
}) => (
  <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={`${bg} ${color} p-3 rounded-xl`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{title}</p>
      <h4 className="text-xl font-bold text-gray-900">{value}</h4>
    </div>
  </div>
);
