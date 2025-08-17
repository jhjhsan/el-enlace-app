import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PublishSuccessScreen({ route, navigation }) {
  // Defaults seguros
  const { status = 'published', castingId, title } = route.params || {};
  const isPublished = status === 'published';

  // Si por algún motivo no llegó el ID del documento, volvemos al panel
  if (!castingId) {
    navigation.reset({ index: 0, routes: [{ name: 'DashboardElite' }] });
    return null;
  }

  const goPrimary = () => {
    if (isPublished) {
      // Ver el detalle del casting recién publicado
      navigation.replace('CastingDetail', { castingId });
    } else {
      // Completar y publicar (edición). Pasamos title si existe.
      navigation.replace('EditPost', { post: { id: castingId, type: 'casting', title: title || '' } });
      // Nota: en EditPostScreen, si faltan campos, haz fetch por id.
    }
  };

  const goDashboard = () => {
    navigation.reset({ index: 0, routes: [{ name: 'DashboardElite' }] });
  };

  return (
    <View style={styles.screen}>
      <Ionicons name="checkmark-circle" size={72} color="#00FF7F" style={{ marginBottom: 12 }} />
      <Text style={styles.title}>{isPublished ? '¡Casting publicado!' : 'Guardado como borrador'}</Text>
      <Text style={styles.subtitle}>
        {title ? `“${title}”` : 'Tu casting'} se guardó correctamente.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={goPrimary}>
        <Text style={styles.primaryText}>
          {isPublished ? 'Ver casting' : 'Completar y publicar'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={goDashboard}>
        <Text style={styles.secondaryText}>Volver al panel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#D8A353',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#D8A353',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: {
    color: '#000',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  secondaryText: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
});
