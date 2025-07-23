import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, Entypo, Feather, FontAwesome } from '@expo/vector-icons';
import { View } from 'react-native';
import { useUser } from '../contexts/UserContext';

// Pantallas de cada tab
import DashboardScreen from '../screens/DashboardScreen';
import DashboardEliteScreen from '../screens/DashboardEliteScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PublishMenuScreen from '../screens/PublishMenuScreen';
import MenuScreen from '../screens/MenuScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileProScreen from '../screens/ProfileProScreen';
import ProfileEliteScreen from '../screens/ProfileEliteScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

function ProfileEliteTabWrapper(props) {
  const { userData } = useUser();

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

  if (isLoading || !userData || !userData.membershipType) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  const membershipType = userData.membershipType;
const [unreadCount, setUnreadCount] = React.useState(0);

React.useEffect(() => {
  const loadUnreadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(`notifications_${userData.id}`);
      const notifications = stored ? JSON.parse(stored) : [];

      const unread = notifications.filter((n) => n.read === false);
      setUnreadCount(unread.length);
    } catch (err) {
      console.log('❌ Error cargando notificaciones locales:', err);
    }
  };

  loadUnreadNotifications();
}, []);
useFocusEffect(
  React.useCallback(() => {
    const loadUnreadItems = async () => {
      try {
        // 🔔 Notificaciones
        const storedNoti = await AsyncStorage.getItem(`notifications_${userData.id}`);
        const notis = storedNoti ? JSON.parse(storedNoti) : [];
        const unreadNoti = notis.filter((n) => n.read === false);

        // 💬 Mensajes no leídos (contar mensajes, no conversaciones)
        const storedMsgs = await AsyncStorage.getItem('professionalMessages');
        const allMsgs = storedMsgs ? JSON.parse(storedMsgs) : [];
        const totalUnreadMsgs = allMsgs.reduce((acc, conv) => {
          const unread = conv.messages?.filter(
            (msg) => msg.sender !== userData.email && msg.read === false
          );
          return acc + (unread?.length || 0);
        }, 0);

        // Total
        const totalUnread = unreadNoti.length + totalUnreadMsgs;
        setUnreadCount(totalUnread);
      } catch (err) {
        console.log('❌ Error leyendo notificaciones y mensajes:', err);
      }
    };

    loadUnreadItems();
  }, [userData?.id, userData?.email])
);

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
  // ❌ Eliminamos el contador visual
// (No mostrar ningún badge mientras está deshabilitado)

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
