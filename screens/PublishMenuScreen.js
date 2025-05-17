// PublishMenuScreen.js actualizado: incluye botones separados para promocionar perfil y publicación

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
  const [membershipType, setMembershipType] = useState(userData?.membershipType || 'free');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  const canAccess = (feature) => {
    const accessMap = {
      casting: membershipType === 'elite',
      service: membershipType !== 'free',
      focus: membershipType !== 'free',
      promote: membershipType === 'pro' || membershipType === 'elite',
    };
    return accessMap[feature];
  };

  const handleRestricted = () => {
    setShowUpgradeModal(true);
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ position: 'absolute', top: 15, left: 20, zIndex: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Opciones de publicación</Text>

        <TouchableOpacity
          style={[styles.button, !canAccess('casting') && styles.lockedButton]}
          onPress={() => {
            canAccess('casting')
              ? navigation.navigate('PublishCastingScreen')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {!canAccess('casting') ? '🔒 🎬 Publicar casting' : '🎬 Publicar casting'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !canAccess('service') && styles.lockedButton]}
          onPress={() => {
            canAccess('service')
              ? navigation.navigate('Publish')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {!canAccess('service') ? '🔒 🛠️ Publicar servicio' : '🛠️ Publicar servicio'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !canAccess('focus') && styles.lockedButton]}
          onPress={() => {
            canAccess('focus')
              ? navigation.navigate('PublishFocusScreen')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {!canAccess('focus') ? '🔒 🎯 Publicar focus' : '🎯 Publicar focus'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('CreateAdScreen')}
        >
          <Text style={styles.buttonText}>📢 Publicar anuncio publicitario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !canAccess('promote') && styles.lockedButton]}
          onPress={() => {
            canAccess('promote')
              ? navigation.navigate('PromoteProfile')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {!canAccess('promote') ? '🔒 💎 Promocionar perfil' : '💎 Promocionar perfil'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !canAccess('promote') && styles.lockedButton]}
          onPress={() => {
            canAccess('promote')
              ? navigation.navigate('PromotePost')
              : handleRestricted();
          }}
        >
          <Text style={styles.buttonText}>
            {!canAccess('promote') ? '🔒 📣 Promocionar publicación' : '📣 Promocionar publicación'}
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
            <Text style={styles.upgradeTitle}>🔒 Función exclusiva</Text>
            <Text style={styles.upgradeText}>
              Esta función está disponible solo para usuarios con membresía Pro o Elite. Mejora tu plan para desbloquearla.
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
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  lockedButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
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