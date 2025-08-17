import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchServicesFromFirestore } from '../src/firebase/helpers/fetchServicesFromFirestore';

export default function ExplorePostsScreen() {
  const [posts, setPosts] = useState([]);
  const navigation = useNavigation();

  const normalizeService = (p) => {
    return {
      id: p.id || String(p.createdAt || Date.now()),
      title: p.title || 'Servicio',
      description: p.description || '',
      category: p.category || '',
      date: p.date || '',
      location: p.location || '',
      creatorEmail: p.creatorEmail || '',
      image: p.photoUri || p.image || null,
      chatEnabled: p.chatEnabled !== false,
      enableWhats: !!p.enableWhats,
      contactWhats: p.contactWhats || '',
      _docId: p._docId || p.docId || undefined,
    };
  };

  const loadDeletedServiceIds = async () => {
    try {
      const raw = await AsyncStorage.getItem('deletedServices');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const isBlacklistedService = (svc, blacklist) => {
    const sid = String(svc?.id || '');
    const docId = String(svc?._docId || svc?.docId || '');
    return (sid && blacklist.includes(sid)) || (docId && blacklist.includes(docId));
  };

  const uniqueById = (arr) => {
    const seen = new Set();
    return arr.filter((x) => {
      const k = String(x?.id || x?._docId || x?.docId || '');
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  useEffect(() => {
    const loadPostsFromFirestore = async () => {
      try {
        const data = await fetchServicesFromFirestore();
        const normalized = Array.isArray(data) ? data.map(normalizeService) : [];
        const blacklist = await loadDeletedServiceIds();
        const filtered = uniqueById(normalized).filter((s) => !isBlacklistedService(s, blacklist));
        setPosts(filtered);
      } catch (error) {
        console.error('Error al cargar publicaciones desde Firestore:', error);
      }
    };
    loadPostsFromFirestore();
  }, []);

  const openService = (post) => {
    navigation.navigate('ServiceDetailScreen', {
      serviceId: post.id,
      service: post,
    });
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🔍 Explorar Servicios</Text>

        {posts.length === 0 ? (
          <Text style={styles.empty}>No hay publicaciones disponibles.</Text>
        ) : (
          posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              activeOpacity={0.8}
              onPress={() => openService(post)}
              style={[
                styles.card,
                {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                },
              ]}
            >
              {post.image && <Image source={{ uri: post.image }} style={styles.image} />}

              <View style={{ marginTop: 10 }}>
                <Text style={styles.cardTitle}>📌 {post.title}</Text>
                {!!post.category && <Text style={styles.cardText}>📂 {post.category}</Text>}
                {!!post.description && <Text style={styles.cardText}>{post.description}</Text>}
                {!!post.location && <Text style={styles.cardText}>📍 {post.location}</Text>}
                {!!post.date && <Text style={styles.cardText}>📅 {post.date}</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  backBtn: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  container: { padding: 10, paddingBottom: 120 },
  title: {
    color: '#D8A353',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    top: 40,
    marginBottom: 50,
  },
  empty: { color: '#999', textAlign: 'center', marginTop: 50 },
  card: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
    borderRadius: 8,
    padding: 10,
    marginBottom: 2,       // ⬅️ margen vertical aumentado
    marginHorizontal: -5,    // ⬅️ margen lateral agregado
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    marginTop: -5,
    fontWeight: '600',
    marginBottom: 0,
  },
  cardText: { color: '#bbb', fontSize: 12, marginBottom: 2 },
});
