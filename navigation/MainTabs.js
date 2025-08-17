import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, Entypo, Feather, FontAwesome } from '@expo/vector-icons';
import { View } from 'react-native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import eventBus from '../utils/eventBus';
import { useNavigation } from '@react-navigation/native';

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

  // Recalcula el contador cuando cambian las notificaciones
useEffect(() => {
  const recalculateUnread = async () => {
    if (!userData?.id) return;
    const stored = await AsyncStorage.getItem(`notifications_${userData.id}`);
    const notifications = stored ? JSON.parse(stored) : [];
    const unread = notifications.filter(n => n.read === false);
    setUnreadCount(unread.length);
    console.log('[MainTabs] 🔔 Unread actualizado por eventBus:', unread.length);
  };

  eventBus.on('notificationsUpdated', recalculateUnread);
  recalculateUnread();

  return () => {
    eventBus.off('notificationsUpdated', recalculateUnread);
  };
}, [userData?.id]);

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
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
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
