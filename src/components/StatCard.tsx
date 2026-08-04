
import React, { FC } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const StatCard: FC<StatCardProps> = ({ title, value, icon, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center transition-all duration-200 ${
            onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 group' : ''
        }`}
    >
        <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-200">
            {icon}
        </div>
        <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</p>
            <p className="text-2xl font-black text-gray-800 tracking-tight mt-0.5 font-mono">{value}</p>
        </div>
    </div>
);

export default StatCard;
