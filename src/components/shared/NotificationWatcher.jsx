import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import useNow from '../../hooks/useNow';
import { ROLES } from '../../utils/constants';
import { remindDueCalls, remindTrainingHandoffs } from '../../services/notifications';

export default function NotificationWatcher() {
  const { role } = useAuth();
  const { leads, clients } = useCrmStore();
  const now = useNow(15000);

  useEffect(() => {
    if (role === ROLES.SALES || role === ROLES.CONFIG) remindDueCalls(leads, now);
    if (role === ROLES.TRAINING || role === ROLES.CONFIG) remindTrainingHandoffs(clients);
  }, [role, leads, clients, now]);

  return null;
}
