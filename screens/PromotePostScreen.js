import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';

export default function PromotePostScreen() {
  const navigation = useNavigation();
  const { userData } = useUser();

  const isFree = userData?.membershipType === 'free';

  const handlePress = (target) => {
    if (isFree) {
      navigation.navigate('Subscription');
    } else {
      navigation.navigate(target);
    }
  };

  return (
    <View style={styles.container}>
      {/* Flecha */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>🌟 Promocionar publicación</Text>
      <Text style={styles.subtitle}>Selecciona el tipo de contenido que deseas destacar</Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handlePress('PromoteServiceScreen')}
      >
        <Text style={styles.optionText}>📢 Servicio</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handlePress('PromoteFocusScreen')}
      >
        <Text style={styles.optionText}>🧠 Focus Group</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => handlePress('PromoteAdScreen')}
      >
        <Text style={styles.optionText}>📺 Anuncio Visual</Text>
      </TouchableOpacity>

      {isFree && (
        <Text style={styles.lockNote}>🔒 Disponible solo para cuentas Pro o Elite</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 30,
    left: 20,
    zIndex: 10,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  optionButton: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lockNote: {
    color: '#aaa',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 30,
  },
});
