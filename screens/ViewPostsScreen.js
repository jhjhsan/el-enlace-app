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
import BottomBar from '../components/BottomBar';
import { useUser } from '../contexts/UserContext';

export default function ViewPostsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const { userData } = useUser();

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await AsyncStorage.getItem('posts');
        const parsed = data ? JSON.parse(data) : [];

        const filtered = showAllPosts
          ? parsed
          : parsed.filter(post => post.creatorEmail === userData?.email);

        setPosts(filtered.reverse());
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
              const updated = [...posts];
              updated.splice(index, 1);
              await AsyncStorage.setItem('posts', JSON.stringify(updated.reverse()));
              setPosts(updated);
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
              <TouchableOpacity
                onPress={() => deletePost(index)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      <BottomBar navigation={navigation} />
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
});
