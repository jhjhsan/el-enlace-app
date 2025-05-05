// CastingDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function CastingDetailScreen({ route }) {
  const navigation = useNavigation();
  const { casting } = route.params || {}; // Espera recibir un objeto casting como prop

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{casting?.title || 'Título del Casting'}</Text>
        <Text style={styles.description}>{casting?.description || 'Descripción del casting no disponible.'}</Text>

        {casting?.image && (
          <Image source={{ uri: casting.image }} style={styles.image} />
        )}

        <View style={styles.detailBox}>
          <Text style={styles.detailText}>Categoría: {casting?.category || 'General'}</Text>
          <Text style={styles.detailText}>Ubicación: {casting?.location || 'No especificada'}</Text>
          <Text style={styles.detailText}>Fecha límite: {casting?.deadline || 'No informada'}</Text>
        </View>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => navigation.navigate('SubmitApplication', { castingId: casting?.id })}
        >
          <Text style={styles.buttonText}>Postularme a este Casting</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewApplicationsButton}
          onPress={() => navigation.navigate('ViewApplications', { castingId: casting?.id })}
        >
          <Text style={styles.buttonText}>📥 Ver postulaciones recibidas</Text>
        </TouchableOpacity>

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
    alignItems: 'center',
    padding: 20,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 15,
    textAlign: 'justify',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  detailBox: {
    width: '100%',
    backgroundColor: '#1B1B1B',
    padding: 15,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginBottom: 20,
  },
  detailText: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 5,
  },
  applyButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 10,
  },
  viewApplicationsButton: {
    backgroundColor: '#1B1B1B',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  buttonText: {
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
