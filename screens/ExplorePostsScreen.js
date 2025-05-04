import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomBar from '../components/BottomBar';

export default function ExplorePostsScreen() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await AsyncStorage.getItem('posts');
        const parsed = data ? JSON.parse(data) : [];
        setPosts(parsed);
      } catch (error) {
        console.error('Error al cargar publicaciones:', error);
      }
    };

    loadPosts();
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🔍 Explorar Publicaciones</Text>
        {posts.length === 0 ? (
          <Text style={styles.empty}>No hay publicaciones disponibles.</Text>
        ) : (
          posts.map((post, index) => (
            <View key={index} style={styles.card}>
              {post.image && <Image source={{ uri: post.image }} style={styles.image} />}
              <Text style={styles.cardTitle}>{post.title}</Text>
              <Text style={styles.cardText}>{post.description}</Text>
              <Text style={styles.cardText}>📂 {post.category}</Text>
              {post.location ? <Text style={styles.cardText}>📍 {post.location}</Text> : null}
              {post.date ? <Text style={styles.cardText}>📅 {post.date}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
      <BottomBar />
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
});
