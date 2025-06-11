import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
} from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

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
  const navigation = useNavigation();

 useEffect(() => {
const fetchUser = async () => {
  const json = await AsyncStorage.getItem('userProfile');
  if (json) {
    const user = JSON.parse(json);
    setMembershipType(user?.membershipType || 'free');

    // Notificaciones normales
    const stored = await AsyncStorage.getItem(`notifications_${user.id}`);
    const notis = stored ? JSON.parse(stored) : [];

    // Notificaciones por contacto limitado
    const pendingKey = `pendingNotifications_${user.email}`;
    const pendingJson = await AsyncStorage.getItem(pendingKey);
    const pending = pendingJson ? JSON.parse(pendingJson) : [];

    // Agrega ícono por defecto
    const enrichedPending = pending.map((p, i) => ({
      id: `pend_${i}_${p.timestamp}`,
      icon: 'chat',
      date: p.timestamp,
      message: p.message,
    }));

    // Combina ambas
    const all = [...notis, ...enrichedPending];

    // Agrega advertencia de prueba gratuita si aplica
    if (user.trialEndsAt && !user.hasPaid) {
      const trialEndDate = new Date(user.trialEndsAt);
      const now = new Date();
      const diffDays = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3 && diffDays >= 0) {
        all.push({
          id: 'trial_alert',
          icon: 'terminos',
          date: now.toISOString(),
          message: `⚠️ Tu prueba gratuita termina en ${diffDays} día(s). Activa tu plan Elite para mantener los beneficios.`,
        });
        // Enviar correo si no se ha enviado ya
const sentKey = `emailAlertSent_${user.email}`;
const sent = await AsyncStorage.getItem(sentKey);
if (!sent) {
  try {
    const functions = getFunctions(getApp());
    const sendEmail = httpsCallable(functions, 'sendTrialAlertEmail');
    await sendEmail({ email: user.email });
    await AsyncStorage.setItem(sentKey, 'true');
    console.log('📧 Alerta de correo enviada');
  } catch (error) {
    console.log('❌ Error al enviar correo:', error);
  }
}
      }
    }

    setNotifications(all.reverse());
  }
};
  fetchUser();
}, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={async () => {
        const allCastings = await AsyncStorage.getItem('posts');
        const castings = allCastings ? JSON.parse(allCastings) : [];
        const casting = castings.find(c => c.id === item.castingId);

        if (casting) {
          navigation.navigate('CastingDetail', { casting });
        } else {
          Alert.alert('Casting no encontrado', 'Este casting ya no está disponible.');
        }
      }}
    >
      <View style={styles.icon}>{icons[item.icon] || icons['casting']}</View>
      <View style={styles.textContainer}>
        <Text style={styles.message} numberOfLines={2} ellipsizeMode="tail">
          {item.message}
        </Text>
        <Text style={styles.time}>
          {new Date(item.date).toLocaleString('es-CL')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <BackButton />
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
      </View>

      {membershipType === 'free' ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            🔒 Esta funcionalidad está disponible solo para miembros Pro o Elite. Actualiza tu membresía para recibir notificaciones.
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <Text style={styles.empty}>No tienes notificaciones aún.</Text>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    marginTop:25,
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
    backgroundColor: '#1B1B1B',
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
  empty: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 40,
  },
});
