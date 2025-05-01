// components/BottomBar.js
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, Entypo, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BottomBar() {
  const navigation = useNavigation();
  const [membershipType, setMembershipType] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        setMembershipType(user.membershipType || 'free');
      }
    };
    loadUser();
  }, []);

  const handlePublish = () => {
    if (membershipType === 'pro') {
      navigation.navigate('PublishMenu');
    } else {
      Alert.alert('Función solo para miembros Pro', 'Suscríbete a la Membresía Pro para acceder a esta función.');
    }
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity onPress={handleProfile}>
        <Ionicons name="person-outline" size={24} color="#D8A353" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
        <Entypo name="link" size={24} color="#D8A353" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handlePublish}>
        <Feather name="plus" size={24} color="#D8A353" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
        <Ionicons name="notifications-outline" size={24} color="#D8A353" />
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
});
