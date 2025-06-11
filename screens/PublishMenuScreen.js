import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';

export default function PublishMenuScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();
  const membershipType = userData?.membershipType || 'free';
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const hasPaid = String(userData?.hasPaid) === 'true';

  useEffect(() => {
    const loadPaymentStatus = async () => {
      const json = await AsyncStorage.getItem('userData');
      const user = json ? JSON.parse(json) : {};

      setHasPaid(user?.hasPaid === true);
    };
    loadPaymentStatus();
  }, []);

  useEffect(() => {
    const loadMembership = async () => {
      const json = await AsyncStorage.getItem('userProfile');
      if (json) {
        const user = JSON.parse(json);
        setMembershipType(user.membershipType || 'free');
      }
    };
    loadMembership();
  }, []);

  const isEliteBlocked = membershipType === 'elite' && !hasPaid;
  const isFreeBlocked = membershipType === 'free';
  const isProBlockedCasting = membershipType === 'pro';

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Opciones de publicación</Text>

        <TouchableOpacity
  style={[styles.button, (isEliteBlocked || isFreeBlocked || isProBlockedCasting) && styles.lockedButton]}
  onPress={() => {
    if (isEliteBlocked) {
      setShowUpgradeModal(true);
    } else if (isFreeBlocked || isProBlockedCasting) {
      setShowProModal(true);
    } else {
      navigation.navigate('PublishCastingScreen');
    }
  }}
>
  <Text style={styles.buttonText}>
    {(isEliteBlocked || isFreeBlocked || isProBlockedCasting) ? '🔒 🎬 Publicar casting' : '🎬 Publicar casting'}
  </Text>
</TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (isEliteBlocked || isFreeBlocked) && styles.lockedButton]}
          onPress={() => {
            if (isEliteBlocked) {
              setShowUpgradeModal(true);
            } else if (isFreeBlocked) {
              setShowProModal(true);
            } else {
              navigation.navigate('Publish');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 🛠️ Publicar servicio' : '🛠️ Publicar servicio'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (isEliteBlocked || isFreeBlocked) && styles.lockedButton]}
          onPress={() => {
            if (isEliteBlocked) {
              setShowUpgradeModal(true);
            } else if (isFreeBlocked) {
              setShowProModal(true);
            } else {
              navigation.navigate('PublishFocusScreen');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 🎯 Publicar focus' : '🎯 Publicar focus'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (isEliteBlocked || isFreeBlocked) && styles.lockedButton]}
          onPress={() => {
            if (isEliteBlocked) {
              setShowUpgradeModal(true);
            } else if (isFreeBlocked) {
              setShowProModal(true);
            } else {
              navigation.navigate('CreateAdScreen');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 📢 Publicar anuncio publicitario' : '📢 Publicar anuncio publicitario'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (isEliteBlocked || isFreeBlocked) && styles.lockedButton]}
          onPress={() => {
            if (isEliteBlocked) {
              setShowUpgradeModal(true);
            } else if (isFreeBlocked) {
              setShowProModal(true);
            } else {
              navigation.navigate('PromoteProfile');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 💎 Promocionar perfil' : '💎 Promocionar perfil'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (isEliteBlocked || isFreeBlocked) && styles.lockedButton]}
          onPress={() => {
            if (isEliteBlocked) {
              setShowUpgradeModal(true);
            } else if (isFreeBlocked) {
              setShowProModal(true);
            } else {
              navigation.navigate('PromotePost');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {(isEliteBlocked || isFreeBlocked) ? '🔒 📣 Promocionar publicación' : '📣 Promocionar publicación'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upgradeModal}>
            <Text style={styles.upgradeTitle}>🔒 Acceso exclusivo Elite</Text>
            <Text style={styles.upgradeText}>
              Esta función requiere una suscripción Elite. Actualiza tu plan para acceder.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => {
                setShowUpgradeModal(false);
                navigation.navigate('Subscription');
              }}
            >
              <Text style={styles.upgradeButtonText}>Ver plan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
              <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
  visible={showProModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowProModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.upgradeModal}>
      <Text style={styles.upgradeTitle}>🔒 Acceso restringido</Text>
      <Text style={styles.upgradeText}>
      Función exclusiva para usuarios con plan Pro. Mejora tu cuenta para acceder a herramientas profesionales.
      </Text>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={() => {
          setShowProModal(false);
          navigation.navigate('Subscription');
        }}
      >
        <Text style={styles.upgradeButtonText}>Ver planes</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowProModal(false)}>
        <Text style={{ color: '#aaa', marginTop: 10 }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingBottom: 100,
    paddingTop: 60,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginBottom: 8,
    borderRadius: 10,
    alignItems: 'center',
    width: 340,
  },
  lockedButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: '500',
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