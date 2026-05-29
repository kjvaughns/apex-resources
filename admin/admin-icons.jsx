// APEX Admin — icon set (stroke-based line icons, currentColor)
const Ico = ({ d, fill, vb = "0 0 24 24", sw = 1.8 }) => (
  <svg viewBox={vb} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const Icons = {
  lock: () => <Ico d={<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>} />,
  dashboard: () => <Ico d={<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>} />,
  plus: () => <Ico d={<><path d="M12 5v14M5 12h14" /></>} />,
  list: () => <Ico d={<><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>} />,
  video: () => <Ico d={<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>} />,
  pdf: () => <Ico d={<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>} />,
  training: () => <Ico d={<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M21 8v5M7 10.5V15c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5" /></>} />,
  guide: () => <Ico d={<><path d="M4 5a2 2 0 0 1 2-2h7v18H6a2 2 0 0 1-2-2z" /><path d="M13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>} />,
  tool: () => <Ico d={<><path d="M14.5 6.5a3.5 3.5 0 0 0-4.6 4.3L4 16.7V20h3.3l5.9-5.9a3.5 3.5 0 0 0 4.3-4.6l-2.3 2.3-2-2 1.3-3.3z" /></>} />,
  star: (filled) => <Ico fill={filled} sw={1.6} d={<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9z" />} />,
  edit: () => <Ico d={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>} />,
  trash: () => <Ico d={<><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></>} />,
  search: () => <Ico d={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>} />,
  arrow: () => <Ico d={<><path d="M5 12h14M13 6l6 6-6 6" /></>} />,
  logout: () => <Ico d={<><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" /><path d="M16 17l5-5-5-5M21 12H9" /></>} />,
  grip: () => <Ico fill sw={0} vb="0 0 10 16" d={<><circle cx="3" cy="3" r="1.3" /><circle cx="7" cy="3" r="1.3" /><circle cx="3" cy="8" r="1.3" /><circle cx="7" cy="8" r="1.3" /><circle cx="3" cy="13" r="1.3" /><circle cx="7" cy="13" r="1.3" /></>} />,
  upload: () => <Ico d={<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>} />,
  check: () => <Ico sw={2.4} d={<path d="M4 12.5l5 5L20 6.5" />} />,
  link: () => <Ico d={<><path d="M9 15l6-6" /><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1M13 18l-1 1a4 4 0 0 1-6-6l1-1" /></>} />,
  clock: () => <Ico d={<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>} />,
  audio: () => <Ico d={<><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></>} />,
  user: () => <Ico d={<><circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /></>} />,
  users: () => <Ico d={<><circle cx="9" cy="8" r="3.4" /><path d="M3 19c0-3 2.7-5.4 6-5.4s6 2.4 6 5.4" /><path d="M16 5.2a3.4 3.4 0 0 1 0 6.4M21 19c0-2.4-1.5-4.4-3.7-5.1" /></>} />,
  mic: () => <Ico d={<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>} />,
};

Object.assign(window, { Icons });
