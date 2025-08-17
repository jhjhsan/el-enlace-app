import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';

// Helpers existentes
import { fetchCastingsFromFirestore } from '../src/firebase/helpers/fetchCastingsFromFirestore';
import { deleteCastingFromFirestore } from '../src/firebase/helpers/deleteCastingFromFirestore';

// 🔹 Nuevo: servicios (para "ver todas" y para borrar servicios correctamente)
import { fetchServicesFromFirestore } from '../src/firebase/helpers/fetchServicesFromFirestore';

import {
  getFirestore,
  doc as fsDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export default function ViewPostsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const { userData } = useUser();
  const db = getFirestore();

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const localData = await AsyncStorage.getItem('posts');
        const localParsed = localData ? JSON.parse(localData) : [];

        if (showAllPosts) {
          // 🌍 Mostrar todos (castings + servicios) desde Firestore
          const [onlineCastings, onlineServices] = await Promise.all([
            fetchCastingsFromFirestore().catch(() => []),
            fetchServicesFromFirestore().catch(() => []),
          ]);

          // normaliza por si falta type
          const norm = (arr, defType) =>
            (Array.isArray(arr) ? arr : []).map((p) => ({
              type: p?.type || defType,
              ...p,
            }));

          const all = [
            ...norm(onlineCastings, 'casting'),
            ...norm(onlineServices, 'servicio'),
          ].reverse();

          setPosts(all);
        } else {
          // 🔒 Solo MIS publicaciones desde AsyncStorage
          const filtered = (Array.isArray(localParsed) ? localParsed : []).filter(
            (post) => post?.creatorEmail === userData?.email
          );
          setPosts(filtered.reverse());
        }
      } catch (error) {
        console.error('Error al cargar publicaciones:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadPosts);
    return unsubscribe;
  }, [navigation, showAllPosts, userData?.email]);

  // 🔹 Borrar un servicio en Firestore con varios intentos (id; id por query; email+createdAtMs)
  const deleteServiceFromFirestore = async (service) => {
    const id = String(service?.id || '');
    const myEmail = (service?.creatorEmail || '').trim().toLowerCase();

    let anyDeleted = false;

    // 1) por docId directo
    try {
      await deleteDoc(fsDoc(db, 'services', id));
      anyDeleted = true;
      console.log('🗑️ Service eliminado por docId:', id);
    } catch (e) {
      console.log('⚠️ No se pudo eliminar service por docId', id, e?.message || e);
    }

    // 2) por query id
    try {
      const qById = query(collection(db, 'services'), where('id', '==', id));
      const snapById = await getDocs(qById);
      for (const d of snapById.docs) {
        await deleteDoc(d.ref);
        anyDeleted = true;
        console.log('🗑️ Service eliminado por query id==', id, ' doc:', d.id);
      }
    } catch (e) {
      console.log('⚠️ Query services id== falló:', e?.message || e);
    }

    // 3) por combo email+createdAtMs si existe
    const createdAtMs = Number(service?.createdAt || service?.createdAtMs || 0) || 0;
    if (myEmail && createdAtMs) {
      try {
        const qCombo = query(
          collection(db, 'services'),
          where('creatorEmail', '==', myEmail),
          where('createdAtMs', '==', createdAtMs)
        );
        const snapCombo = await getDocs(qCombo);
        for (const d of snapCombo.docs) {
          await deleteDoc(d.ref);
          anyDeleted = true;
          console.log('🗑️ Service eliminado por email+createdAtMs doc:', d.id);
        }
      } catch (e) {
        console.log('⚠️ Query services email+createdAtMs falló:', e?.message || e);
      }
    }

    return anyDeleted;
  };

  const deletePost = (index) => {
    const post = posts[index];
    const isService = (post?.type || '').toLowerCase() === 'servicio';

    Alert.alert(
      isService ? 'Eliminar servicio' : 'Eliminar publicación',
      '¿Estás seguro de que quieres eliminar esto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isService) {
                await deleteServiceFromFirestore(post);
              } else {
                await deleteCastingFromFirestore(post.id, post.creatorEmail);
              }

              // limpiar local
              try {
                const localData = await AsyncStorage.getItem('posts');
                const localParsed = localData ? JSON.parse(localData) : [];
                const filteredLocal = (Array.isArray(localParsed) ? localParsed : []).filter(
                  (p) => String(p.id) !== String(post.id)
                );
                await AsyncStorage.setItem('posts', JSON.stringify(filteredLocal));
              } catch (e) {
                console.log('⚠️ Limpieza local falló:', e?.message || e);
              }

              // refrescar UI
              const updated = [...posts];
              updated.splice(index, 1);
              setPosts([...updated]);
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📢 Publicaciones Guardadas</Text>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowAllPosts(!showAllPosts)}
        >
          <Text style={styles.toggleText}>
            {showAllPosts ? '🔒 Ver solo mis publicaciones' : '🌍 Ver todas las publicaciones'}
          </Text>
        </TouchableOpacity>

        {posts.length === 0 ? (
          <Text style={styles.empty}>No hay publicaciones aún.</Text>
        ) : (
          posts.map((post, index) => (
            <View
              key={post.id || index}
              style={[
                styles.card,
                post.isPromotional && styles.promotionalCard,
              ]}
            >
              {post.image && (
                <Image source={{ uri: post.image }} style={styles.image} />
              )}

              <Text style={styles.cardTitle}>{post.title}</Text>
              {!!post.description && <Text style={styles.cardText}>{post.description}</Text>}
              {!!post.category && <Text style={styles.cardText}>📂 {post.category}</Text>}
              {!!post.location && <Text style={styles.cardText}>📍 {post.location}</Text>}
              {!!post.date && <Text style={styles.cardText}>📅 {post.date}</Text>}
              {post.isPromotional && (
                <Text style={styles.promotionalText}>⭐ Publicación Promocional</Text>
              )}

              {/* Editar → pasa isService si corresponde */}
              {!post.isPromotional && (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('EditPost', {
                      post,
                      isService: (post?.type || '').toLowerCase() === 'servicio',
                    })
                  }
                  style={styles.editButton}
                >
                  <Text style={styles.editText}>✏️ Editar</Text>
                </TouchableOpacity>
              )}

              {/* Eliminar */}
              <TouchableOpacity
                onPress={() => deletePost(index)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: 'absolute', top: 0, left: 20, zIndex: 10 }}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
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
    padding: 10,
    paddingBottom: 120,
    marginTop: 40,
  },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  toggleButton: {
    backgroundColor: '#1B1B1B',
    padding: 10,
    borderRadius: 10,
    borderColor: '#D8A353',
    borderWidth: 1,
    marginBottom: 20,
  },
  toggleText: {
    color: '#D8A353',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },
  card: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderRadius: 10,
    padding: 15,
    marginBottom: 5,
  },
  promotionalCard: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: '#222',
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 3,
  },
  promotionalText: {
    color: '#FFD700',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  },
  editButton: {
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  editText: {
    color: '#D8A353',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 10,
    paddingVertical: 6,
    backgroundColor: '#550000',
    borderRadius: 5,
  },
  deleteText: {
    color: '#fff',
    textAlign: 'center',
  },
  back: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginTop: 10,
  },
});
