import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function MyCastingsScreen() {
  const navigation = useNavigation();
  const [castings, setCastings] = useState([]);

  useEffect(() => {
    const loadCastings = async () => {
      try {
        const data = await AsyncStorage.getItem('posts');
        const parsed = data ? JSON.parse(data) : [];
        const onlyCastings = parsed.filter((post) => post.type === 'casting');
        setCastings(onlyCastings);
      } catch (error) {
        console.error('Error al cargar castings:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadCastings);
    return unsubscribe;
  }, [navigation]);

  const createTestCasting = async () => {
    const demoCasting = {
      id: Date.now().toString(),
      title: 'Casting de prueba',
      description: 'Se busca actor para cortometraje ficticio. Grabación en Santiago. Remunerado.',
      category: 'Actor',
      type: 'casting',
      date: new Date().toISOString().split('T')[0],
      isPromotional: false,
    };

    const existing = await AsyncStorage.getItem('posts');
    const parsed = existing ? JSON.parse(existing) : [];
    parsed.push(demoCasting);
    await AsyncStorage.setItem('posts', JSON.stringify(parsed));
    Alert.alert('Casting de prueba creado', 'Ahora puedes verlo en el listado.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📋 Mis Castings</Text>
        <Text style={styles.info}>
          Aquí podrás ver y gestionar los castings que has publicado en El Enlace.
        </Text>

        {/* Botón temporal para crear casting ficticio */}
        <TouchableOpacity
          style={[styles.button, { marginBottom: 30 }]}
          onPress={createTestCasting}
        >
          <Text style={styles.buttonText}>🔧 Crear casting de prueba</Text>
        </TouchableOpacity>

        {/* Lista de castings */}
        {castings.length === 0 ? (
          <Text style={styles.empty}>Aún no has publicado castings.</Text>
        ) : (
          castings.map((casting, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() =>
                navigation.navigate('CastingDetail', {
                  castingId: casting.id,
                  castingTitle: casting.title,
                  casting,
                })
              }
            >
              <Text style={styles.cardTitle}>{casting.title}</Text>
              <Text style={styles.cardDate}>📅 {casting.date}</Text>
              <Text style={styles.cardCategory}>🎭 {casting.category}</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>⬅ Volver</Text>
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
    padding: 20,
    paddingBottom: 120,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: '#D8A353',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  info: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: {
    color: '#888',
    marginTop: 50,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  buttonText: {
    color: '#D8A353',
    fontWeight: 'bold',
  },
  card: {
    width: '100%',
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDate: {
    color: '#ccc',
    marginBottom: 4,
  },
  cardCategory: {
    color: '#aaa',
  },
  back: {
    marginTop: 30,
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
