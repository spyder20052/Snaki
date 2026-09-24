const paths: Record<string, string> = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6',
  payments: 'M3 5h18v14H3z M3 10h18 M7 15h3',
  customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',
  products: 'M5 7h14l-2 14H7z M4 7h16 M12 7l2-5h4 M9 12h.01 M14 15h.01 M10 18h.01',
  categories: 'M3 7h7l2-3h9v16H3z',
  promotions: 'M3 3h8l10 10-8 8L3 11z M7 7h.01',
  zones: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  content: 'M3 4h18v16H3z M3 9h18 M9 9v11',
  media: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M16 7h.01',
  reviews: 'm12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1z',
  analytics: 'M3 3v18h18 M7 16v-4 M12 16V7 M17 16v-7',
  funnel: 'M3 4h18l-7 9v7l-4-2v-5z',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  users: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M18 6 6 18',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7h.01',
  check: 'm5 12 4 4L19 6',
  arrow: 'M5 12h14 m-6-6 6 6-6 6',
}

export function Icon({ name = 'overview', size = 18 }: { name?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d={paths[name] || paths.overview} /></svg>
}
