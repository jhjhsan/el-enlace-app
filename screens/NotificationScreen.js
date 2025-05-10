import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import BottomBar from '../components/BottomBar';

const icons = {
  mensaje: <Ionicons name="mail" size={20} color="#D8A353" />,
  chat: <MaterialIcons name="chat" size={20} color="#D8A353" />,
  casting: <Ionicons name="checkmark-done" size={20} color="#D8A353" />,
  reseña: <FontAwesome5 name="star" size={16} color="#D8A353" />,
  terminos: <Feather name="tool" size={20} color="#D8A353" />,
};

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState([]);
  const [membershipType, setMembershipType] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        setMembershipType(user?.membershipType || 'free');
      }
    };

    const fetchNotifications = async () => {
      const dummyData = [
        { id: '1', icon: 'mensaje', text: 'Agencia XYZ te ha enviado una nueva solicitud', time: 'hace 1 h' },
        { id: '2', icon: 'chat', text: 'Tienes un nuevo mensaje de Casting VIP', time: 'hace 1 h' },
        { id: '3', icon: 'casting', text: 'Has sido seleccionado para un casting', time: 'hace 1 h' },
        { id: '4', icon: 'reseña', text: 'Recibiste una nueva reseña', time: 'hace 1 h' },
        { id: '5', icon: 'terminos', text: 'Actualizamos nuestros términos de uso', time: 'hace 1 h' },
      ];
      setNotifications(dummyData);
    };

    fetchUser();
    fetchNotifications();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.icon}>{icons[item.icon]}</View>
      <View style={styles.textContainer}>
        <Text style={styles.message}>{item.text}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
      </View>

      {membershipType === 'free' ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            🔒 Esta funcionalidad está disponible solo para miembros Pro o Elite. Actualiza tu membresía para recibir notificaciones.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    marginTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    color: '#888',
    fontSize: 12,
  },
  noticeBox: {
    backgroundColor: '#1B1B1B',
    borderRadius: 10,
    margin: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  noticeText: {
    color: '#D8A353',
    textAlign: 'center',
    fontSize: 14,
  },
});
