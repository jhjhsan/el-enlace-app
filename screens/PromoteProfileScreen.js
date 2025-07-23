// PromoteProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import BackButton from '../components/BackButton';
import { guardarAllProfiles } from '../src/firebase/helpers/profileHelpers';

export default function PromoteProfileScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();
  const [selectedDays, setSelectedDays] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alreadyHighlighted, setAlreadyHighlighted] = useState(false);
  const [profileKey, setProfileKey] = useState(null);

  const precios = {
    '7': 3990,
    '14': 6990,
    '30': 11990,
  };

  useEffect(() => {
    const checkHighlightStatus = async () => {
      try {
        const email = userData.email;
        const key = `userProfile_${email}`;
        const fallback = 'userProfilePro';

        let stored = await AsyncStorage.getItem(key);
        let finalKey = key;

        if (!stored) {
          stored = await AsyncStorage.getItem(fallback);
          finalKey = fallback;
        }

        if (!stored) return;

        const parsed = JSON.parse(stored);
        setProfileKey(finalKey);

        if (parsed.isHighlighted && parsed.highlightedUntil) {
          const now = new Date();
          const until = new Date(parsed.highlightedUntil);
          if (until > now) {
            setAlreadyHighlighted(true);
          }
        }
      } catch (e) {
        console.log('Error al verificar destaque:', e);
      }
    };

    checkHighlightStatus();
  }, []);

  const handlePromote = async () => {
    if (!selectedDays) return alert('Selecciona una duración.');
    try {
      const stored = await AsyncStorage.getItem(profileKey);
      if (!stored) return alert('Perfil no encontrado.');
      const parsed = JSON.parse(stored);

      const now = new Date();
      const expiresAt = new Date(now.setDate(now.getDate() + parseInt(selectedDays)));

      const updatedProfile = {
        ...parsed,
        isHighlighted: true,
        highlightedUntil: expiresAt.toISOString(),
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(profileKey, JSON.stringify(updatedProfile));

      // actualizar también en allProfiles
      const existing = await AsyncStorage.getItem('allProfiles');
      const parsedAll = existing ? JSON.parse(existing) : [];
      const filtered = parsedAll.filter(p => p.email?.toLowerCase() !== userData.email.toLowerCase());
      const updatedList = [updatedProfile, ...filtered];
      await guardarAllProfiles(updatedList);

      setShowModal(true);
    } catch (error) {
      console.error('Error al destacar perfil:', error);
      alert('Error al guardar el destaque.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton color="#fff" size={28} top={40} left={20} />

      <Text style={styles.title}>🌟 Destacar Perfil</Text>
      <Text style={styles.description}>
        Destaca tu perfil para aparecer en la sección principal de agencias y productoras.
      </Text>

      {alreadyHighlighted ? (
        <Text style={{ color: '#ccc', marginTop: 40, textAlign: 'center' }}>
          ✅ Tu perfil ya está destacado actualmente.
        </Text>
      ) : (
        <>
          <Text style={styles.label}>Selecciona la duración del destaque:</Text>

          {["7", "14", "30"].map((dias) => (
            <TouchableOpacity
              key={dias}
              style={[styles.optionButton, selectedDays === dias && styles.selectedOption]}
              onPress={() => setSelectedDays(dias)}
            >
              <Text style={styles.optionText}>{dias} días – ${precios[dias].toLocaleString('es-CL')}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.button} onPress={handlePromote}>
            <Text style={styles.buttonText}>💥 Destacar ahora</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>✅ Tu perfil fue destacado correctamente.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 22,
    backgroundColor: '#000',
    flexGrow: 1,
    paddingTop: 50,
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 10,
  },
  optionButton: {
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: '#D8A353',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#D8A353',
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    padding: 25,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    alignItems: 'center',
    width: '85%',
  },
  modalText: {
    color: '#D8A353',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});