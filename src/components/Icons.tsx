import React, { FC } from 'react';

// Props Interface for clean and customizable SVGs
export interface IconProps {
  className?: string;
  size?: number | string;
}

export const Icon: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="mr-3 h-6 w-6 inline-flex items-center justify-center shrink-0">{children}</span>
);

// Standard navigation menu & general purpose flat layout vector icons with Lucide-like stroke consistency
export const DashboardIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

export const ClientsIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.684v-.005z" />
  </svg>
);

export const CasesIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

export const EventsIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

export const BillingIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m3-3.75l-3 3m0 0l-3-3m3 3V15m6-1.5l3 3m0 0l3-3m-3 3V5.25A2.25 2.25 0 0018 3H6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 006 21h12a2.25 2.25 0 002.25-2.25V15" />
  </svg>
);

export const AvocatsIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

export const StaffIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM10.5 18.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

export const PersonnelsIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.684v-.005z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
  </svg>
);

export const AgendaIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008z" />
  </svg>
);

export const ChatIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

export const LogoutIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

export const EyeIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const DownloadIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const AIIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

export const SuppliersIcon: FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.09-1.468M14.25 18.75h-6M16.5 9v3.75a3 3 0 01-3 3h-3a3 3 0 01-3-3V9m-1.5-3h12a1.5 1.5 0 011.5 1.5V9H4.5V7.5A1.5 1.5 0 016 6z" />
  </svg>
);


// ==========================================
// NEW SOLID/LINE FLAT DESIGN DESIGNERS SERIES
// ==========================================

export const CalendarIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const MapPinIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const PhoneIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const ScaleIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v17M12 5l-8 3H4M12 5l8 3M4 8l4 6H2l2-6M20 8l4 6h-6l2-6M12 20h7M12 20H5" />
  </svg>
);

export const UserIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const UsersIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const FolderIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

export const AttachmentIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export const CreditCardIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export const BankIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
  </svg>
);

export const BuildingIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="22" x2="15" y2="16" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M8 6h2M14 6h2M8 10h2M14 10h2" />
  </svg>
);

export const SettingsIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const AlertIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="17" r="1" />
  </svg>
);

export const CheckIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CheckSquareIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export const ChartIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const HandshakeIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const DollarIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const ShieldIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export const BellIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const EditIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const ZapIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const BriefcaseIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const MailIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const CourthouseIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
  </svg>
);

export const ClipboardIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" id="flat-clipboard-icon">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

export const SearchIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" id="flat-search-icon">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const TrashIcon: FC<IconProps> = ({ className = "w-5 h-5", size = "1em" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} className={`${className} inline-block shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" id="flat-trash-icon">
    <polyline points="3 6 5 6 21 6" stroke="currentColor" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" />
    <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" />
    <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" />
  </svg>
);
