import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSameWeek, parseISO } from 'date-fns';

// ✅ Guarda una publicación de servicio con la fecha actual
export const registerServicePost = async () => {
  const history = await AsyncStorage.getItem('servicePostHistory');
  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];

  const parsed = history ? JSON.parse(history) : {};
  parsed[todayKey] = (parsed[todayKey] || 0) + 1;

  await AsyncStorage.setItem('servicePostHistory', JSON.stringify(parsed));
};

// ✅ Cuenta cuántas publicaciones tipo servicio se han hecho esta semana
export const getWeeklyServicePostCount = async () => {
  const history = await AsyncStorage.getItem('servicePostHistory');
  if (!history) return 0;

  const parsed = JSON.parse(history);
  const now = new Date();
  let count = 0;

  for (const [dateStr, qty] of Object.entries(parsed)) {
    const date = parseISO(dateStr);
    if (isSameWeek(now, date, { weekStartsOn: 1 })) {
      count += qty;
    }
  }

  return count;
};
