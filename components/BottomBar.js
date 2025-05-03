import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, Entypo, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';

export default function BottomBar() {
  const navigation = useNavigation();
  const { userData } = useUser();

  const membershipType = userData?.membershipType;

  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate(membershipType === 'pro' ? 'ProfilePro' : 'Profile')
        }
      >
        <View style={membershipType === 'pro' ? styles.proIconContainer : null}>
          <Ionicons
            name={membershipType === 'pro' ? 'person' : 'person-outline'}
            size={24}
            color="#D8A353"
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
        <Entypo name="link" size={24} color="#D8A353" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('PublishMenu')}>
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
  proIconContainer: {
    borderWidth: 2,
    borderColor: '#1B1B1B',
    borderRadius: 1,
    padding: 4,
  },
});
