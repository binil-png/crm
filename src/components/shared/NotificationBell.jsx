import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
  unreadNotificationCount,
} from '../../services/notifications';
import { formatDdMmYyyyHm } from '../../utils/constants';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => listNotifications());
  const rootRef = useRef(null);
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => subscribeNotifications(setItems), []);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setItems(listNotifications());
          setOpen((value) => !value);
        }}
        className="relative inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600"
        title={unread ? `${unread} unread alerts` : 'Notifications'}
      >
        <Bell size={14} />
        {unread ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-semibold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unreadNotificationCount() ? (
              <button type="button" className="text-xs text-sky-700" onClick={markAllNotificationsRead}>
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No alerts yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => markNotificationRead(item.id)}
                  className={`block w-full border-b border-slate-100 px-3 py-2 text-left ${
                    item.read ? 'bg-white' : 'bg-sky-50'
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  {item.body ? <p className="text-xs text-slate-500">{item.body}</p> : null}
                  <p className="mt-1 text-[10px] text-slate-400">{formatDdMmYyyyHm(item.at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
