import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';

export default function InboxScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();
  const [conversations, setConversations] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  useEffect(() => {
    const loadInbox = async () => {
      const isFree = userData?.membershipType === 'free';
      const isEliteBlocked = userData?.membershipType === 'elite' && !userData?.hasPaid;

      if (!userData || isEliteBlocked) {
        setShowUpgradeModal(true);
        return;
      }

      if (isFree) {
        const pendingRaw = await AsyncStorage.getItem('pendingMessages');
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          const userPending = pending.filter(p => p.toEmail === userData.email);
          if (userPending.length > 0) {
            setShowPendingModal(true);
          }
        }
      }

      const json = await AsyncStorage.getItem('professionalMessages');
      if (!json) return;

      const allMessages = JSON.parse(json);
      const now = new Date();

      const filteredMessages = allMessages.filter((msg) => {
        const msgDate = new Date(msg.timestamp);
        const diffDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));
        return msg.response || diffDays < 7;
      });

      await AsyncStorage.setItem('professionalMessages', JSON.stringify(filteredMessages));

      const myConversations = filteredMessages.filter(
        (msg) => msg.from === userData.email || msg.to === userData.email
      );

      const grouped = myConversations.reduce((acc, msg) => {
        const otherUser = msg.from === userData.email ? msg.to : msg.from;
        if (!acc[otherUser]) acc[otherUser] = [];
        acc[otherUser].push(msg);
        return acc;
      }, {});

      const formatted = Object.keys(grouped).map((user) => {
        const messages = grouped[user];
        const lastMessage = messages[messages.length - 1];
        return {
          user,
          lastMessage: lastMessage.message || lastMessage.response,
          timestamp: lastMessage.timestamp,
        };
      });

      setConversations(formatted);
    };

    const unsubscribe = navigation.addListener('focus', loadInbox);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📥 Bandeja de Entrada</Text>

        {conversations.length === 0 ? (
          <Text style={styles.empty}>No hay mensajes aún.</Text>
        ) : (
          conversations.map((conv, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() =>
                navigation.navigate('MessageDetail', {
                  contactEmail: conv.user,
                })
              }
            >
              <Text style={styles.user}>{conv.user}</Text>
              <Text style={styles.preview}>✉️ {conv.lastMessage}</Text>
              <Text style={styles.timestamp}>
                {new Date(conv.timestamp).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <BackButton />

        <Modal
          visible={showUpgradeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUpgradeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.upgradeModal}>
              <Text style={styles.upgradeTitle}>🔒 Función exclusiva</Text>
              <Text style={styles.upgradeText}>
                Mejora tu membresía para acceder a la bandeja de mensajes profesionales.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  setShowUpgradeModal(false);
                  navigation.navigate('Subscription');
                }}
              >
                <Text style={styles.upgradeButtonText}>💳 Ver planes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
                <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPendingModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPendingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.upgradeModal}>
              <Text style={styles.upgradeTitle}>📬 ¡Tienes mensajes pendientes!</Text>
              <Text style={styles.upgradeText}>
                Agencias están intentando contactarte, pero ya alcanzaste tu límite semanal de mensajes.
                Si subes a plan Pro, podrás desbloquear y responder estos mensajes importantes.
              </Text>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  setShowPendingModal(false);
                  navigation.navigate('Subscription');
                }}
              >
                <Text style={styles.upgradeButtonText}>🚀 Subir a plan Pro</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPendingModal(false)}>
                <Text style={{ color: '#aaa', marginTop: 10 }}>Volver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    padding: 20,
    paddingBottom: 100,
    marginTop: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D8A353',
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  user: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  preview: {
    color: '#aaa',
    fontSize: 13,
  },
  timestamp: {
    color: '#666',
    fontSize: 11,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeModal: {
    backgroundColor: '#1B1B1B',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 1,
    marginHorizontal: 30,
    zIndex: 1000,
    elevation: 20,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D8A353',
    marginBottom: 10,
    textAlign: 'center',
  },
  upgradeText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  upgradeButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
