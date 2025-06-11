import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function PromoteProfileScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Flecha de volver */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📢 Promocionar Perfil</Text>
        <Text style={styles.subtitle}>
          Aquí podrás destacar tu perfil para llegar a más agencias y productoras.
        </Text>
        <Text style={styles.info}>
          Esta funcionalidad estará disponible pronto con opciones de pago y duración personalizada.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    marginTop:30,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#D8A353',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  info: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});
