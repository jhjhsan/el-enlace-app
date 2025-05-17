import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons, Entypo, Feather, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BottomBar() {
  const navigation = useNavigation();
  const { userData } = useUser();
  const [membership, setMembership] = useState(userData?.membershipType || 'free');
  const [notificationCount, setNotificationCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const fetchMembership = async () => {
        try {
          const stored = await AsyncStorage.getItem('userProfile');
          if (stored) {
            const user = JSON.parse(stored);
            if (user?.membershipType) {
              setMembership(user.membershipType);
            }
          }
        } catch (e) {
          console.log('Error leyendo membershipType:', e);
        }
      };

      fetchMembership();
    }, [])
  );

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const stored = await AsyncStorage.getItem('userNotifications');
        const notifications = stored ? JSON.parse(stored) : [];
        const unreadCount = notifications.filter(n => !n.read).length;
        setNotificationCount(unreadCount);
      } catch (error) {
        console.log('Error al cargar notificaciones:', error);
      }
    };

    const interval = setInterval(fetchNotifications, 5000);
    fetchNotifications();

    return () => clearInterval(interval);
  }, []);

  const goToProfile = () => {
    if (membership === 'elite') {
      navigation.navigate('ProfileElite');
    } else if (membership === 'pro') {
      navigation.navigate('ProfilePro');
    } else {
      navigation.navigate('Profile');
    }
  };

  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity onPress={goToProfile}>
        <View style={membership === 'pro' || membership === 'elite' ? styles.proIconContainer : null}>
          {membership === 'elite' ? (
            <FontAwesome name="star" size={24} color="#D8A353" />
          ) : (
            <Ionicons
              name={membership === 'pro' ? 'person' : 'person-outline'}
              size={24}
              color="#D8A353"
            />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
        <Entypo name="link" size={24} color="#D8A353" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('PublishMenu')}>
        <Feather name="plus" size={24} color="#D8A353" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ position: 'relative' }}>
        <Ionicons name="notifications-outline" size={24} color="#D8A353" />
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
        <Feather name="menu" size={28} color="#D8A353" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1B1B1B',
    height: 60,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  proIconContainer: {
    borderWidth: 2,
    borderColor: '#1B1B1B',
    borderRadius: 1,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
