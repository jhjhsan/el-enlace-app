import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, Entypo, Feather, FontAwesome } from '@expo/vector-icons';
import { View, AppState } from 'react-native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventBus from '../utils/eventBus';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '../contexts/NotificationContext'; // ✅ ADICIÓN

// Pantallas de cada tab
import DashboardScreen from '../screens/DashboardScreen';
import DashboardEliteScreen from '../screens/DashboardEliteScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PublishMenuScreen from '../screens/PublishMenuScreen';
import MenuScreen from '../screens/MenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileProScreen from '../screens/ProfileProScreen';
import ProfileEliteScreen from '../screens/ProfileEliteScreen';

const Tab = createBottomTabNavigator();

function ProfileEliteTabWrapper(props) {
  const { userData } = useUser();
  const navigation = useNavigation();
  
  if (userData?.membershipType === 'elite') {
    return <ProfileEliteScreen {...props} />;
  } else if (userData?.membershipType === 'pro') {
    return <ProfileProScreen {...props} />;
  } else {
    return <ProfileScreen {...props} />;
  }
}

export default function MainTabs() {
  const { userData, isLoading } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const { unreadCount: ctxUnread, recalculateUnreadCount } = useNotification(); // ✅ ADICIÓN

  // Reset visual al cambiar de usuario (evita badge “fantasma” en logout)
  useEffect(() => {
    if (!userData?.id) setUnreadCount(0);
  }, [userData?.id]);

// ✅ ÚNICA fuente de verdad: prioriza ID; si no hay ID, usa EMAIL.
//    No uses Math.max entre ambas llaves.
const recalculateUnread = React.useCallback(async () => {
  try {
    const id = userData?.id || null;
    const emailN = (userData?.email || '').toLowerCase().trim();

    if (id) {
      const raw = await AsyncStorage.getItem(`notifications_${id}`);
      const list = raw ? JSON.parse(raw) : [];
      const unread = list.filter(n => n?.read !== true && n?.read !== 'true').length;
      setUnreadCount(unread);
      return;
    }

    if (emailN) {
      const raw = await AsyncStorage.getItem(`notifications_${emailN}`);
      const list = raw ? JSON.parse(raw) : [];
      const unread = list.filter(n => n?.read !== true && n?.read !== 'true').length;
      setUnreadCount(unread);
      return;
    }

    setUnreadCount(0);
  } catch (e) {
    console.log('[MainTabs][RC][ERROR]:', e?.message || e);
    setUnreadCount(0);
  }
}, [userData?.id, userData?.email]);

// 🔄 Sincroniza con el provider si cambia (usa el valor tal cual)
useEffect(() => {
  if (typeof ctxUnread === 'number') setUnreadCount(ctxUnread);
}, [ctxUnread]);

  // ✅ Recalcula el contador cuando cambian las notificaciones y al montar (con LOG del evento)
  useEffect(() => {
    const handler = () => {
      console.log('[MainTabs][EVT] notificationsUpdated -> recalc');
      recalculateUnread();
    };
    eventBus.on('notificationsUpdated', handler);
    console.log('[MainTabs][EVT] subscribe + initial recalc');
    recalculateUnread();
    return () => eventBus.off('notificationsUpdated', handler);
  }, [recalculateUnread]);

  // Cuando la app vuelve a primer plano, vuelve a calcular (por notis recibidas en bg)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        console.log('[MainTabs][APPSTATE] active -> recalc');
        recalculateUnread();
      }
    });
    return () => sub.remove();
  }, [recalculateUnread]);

  // Siempre después de los hooks
  if (isLoading || !userData || !userData.membershipType) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  const membershipType = userData.membershipType;

  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1B1B1B',
          height: 60,
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#D8A353',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="ProfileTab"
        component={ProfileEliteTabWrapper}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) =>
            membershipType === 'elite' ? (
              <FontAwesome name="star" size={24} color={color} />
            ) : (
              <Ionicons
                name={membershipType === 'pro' ? 'person' : 'person-outline'}
                size={24}
                color={color}
              />
            ),
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={membershipType === 'elite' ? DashboardEliteScreen : DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Entypo name="link" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="PublishTab"
        component={PublishMenuScreen}
        options={{
          tabBarLabel: 'Publicar',
          tabBarIcon: ({ color }) => <Feather name="plus" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationScreen}
        options={{
          tabBarLabel: 'Notificaciones',
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications-outline" size={24} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? String(unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF4444',
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold',
          },
        }}
        listeners={{
          tabPress: () => {
            // Si quieres, deja logs:
            // console.log('🔔 [MainTabs] Tab Notifications PRESSED, unreadCount:', unreadCount);
          }
        }}
      />
      <Tab.Screen
        name="MenuTab"
        component={MenuScreen}
        options={{
          tabBarLabel: 'Menú',
          tabBarIcon: ({ color }) => <Feather name="menu" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
