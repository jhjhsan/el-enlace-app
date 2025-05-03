import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useUser } from '../contexts/UserContext';

export default function ProfileDetailScreen({ route }) {
  const { userData } = useUser();
  const { profile } = route.params;

  const isPro = userData?.membershipType === 'pro';

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: profile.photo }} style={styles.image} />
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.category}>{profile.category}</Text>
      <Text style={styles.description}>{profile.description}</Text>

      {isPro && (
        <>
          <Text style={styles.contact}>📧 Email: {profile.email || 'No disponible'}</Text>
          <Text style={styles.contact}>📸 Instagram: {profile.instagram || 'No disponible'}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    flex: 1,
    padding: 20,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  category: {
    color: '#D8A353',
    fontSize: 16,
    marginBottom: 8,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
  },
  contact: {
    color: '#bbb',
    fontSize: 14,
    marginBottom: 6,
  },
});
