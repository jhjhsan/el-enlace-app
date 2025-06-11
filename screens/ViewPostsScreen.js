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
import { fetchCastingsFromFirestore } from '../src/firebase/helpers/fetchCastingsFromFirestore';
import { deleteCastingFromFirestore } from '../src/firebase/helpers/deleteCastingFromFirestore';

export default function ViewPostsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const { userData } = useUser();

  useEffect(() => {
const loadPosts = async () => {
  try {
    const localData = await AsyncStorage.getItem('posts');
    const localParsed = localData ? JSON.parse(localData) : [];

    if (showAllPosts) {
      // 🔁 Mostrar todos desde Firestore
      const onlinePosts = await fetchCastingsFromFirestore();
      setPosts(onlinePosts.reverse());
    } else {
      // 🔒 Mostrar solo los propios desde AsyncStorage
      const filtered = localParsed.filter(
        post => post.creatorEmail === userData?.email
      );
      setPosts(filtered.reverse());
    }
  } catch (error) {
    console.error('Error al cargar publicaciones:', error);
  }
};
    const unsubscribe = navigation.addListener('focus', loadPosts);
    return unsubscribe;
  }, [navigation, showAllPosts]);

  const deletePost = (index) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Estás seguro de que quieres eliminar esta publicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCastingFromFirestore(posts[index].id, posts[index].creatorEmail);
              const updated = [...posts];
              updated.splice(index, 1);
              await AsyncStorage.setItem('posts', JSON.stringify([...updated].reverse()));
              setPosts([...updated].reverse());
            } catch (error) {
              console.error('Error al eliminar publicación:', error);
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
              <Text style={styles.cardText}>{post.description}</Text>
              <Text style={styles.cardText}>📂 {post.category}</Text>
              {post.location && (
                <Text style={styles.cardText}>📍 {post.location}</Text>
              )}
              {post.date && (
                <Text style={styles.cardText}>📅 {post.date}</Text>
              )}
              {post.isPromotional && (
                <Text style={styles.promotionalText}>⭐ Publicación Promocional</Text>
              )}

              {/* Botón de editar (solo si NO es promocional) */}
              {!post.isPromotional && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('EditPost', { post })}
                  style={styles.editButton}
                >
                  <Text style={styles.editText}>✏️ Editar</Text>
                </TouchableOpacity>
              )}

              {/* Botón de eliminar */}
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
    padding: 20,
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
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
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
