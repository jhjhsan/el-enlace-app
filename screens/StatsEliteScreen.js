import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCastingsFromFirestore } from '../src/firebase/helpers/getCastingsFromFirestore';
import { getPostulationsFromFirestore } from '../src/firebase/helpers/getPostulationsFromFirestore';
import { useNavigation } from '@react-navigation/native';

export default function StatsEliteScreen() {
  const [publishedCount, setPublishedCount] = useState(0);
  const [postulationsCount, setPostulationsCount] = useState(0);
  const [activeAdsCount, setActiveAdsCount] = useState(0);
  const [myCastings, setMyCastings] = useState([]);
  const [filter, setFilter] = useState('all');
  const navigation = useNavigation();

  useEffect(() => {
    loadStats();
  }, [filter]);

  const loadStats = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData'));
      const email = userData?.email;
      const now = new Date();

      const allCastings = await getCastingsFromFirestore(email);
      const allPostulations = await getPostulationsFromFirestore(email);
      const adsData = JSON.parse(await AsyncStorage.getItem('adsData')) || [];

      const filteredCastings = allCastings.filter(c => {
        if (c.creatorEmail !== email) return false;
        if (filter === 'all') return true;
        const castingDate = new Date(c.createdAt || c.syncedAt || 0);
        const diffDays = (now - castingDate) / (1000 * 60 * 60 * 24);
        return filter === '7d' ? diffDays <= 7 : diffDays <= 30;
      });

      const myPostulations = allPostulations.filter(p =>
        filteredCastings.some(c => c.id === p.castingId)
      );

      const myAds = adsData.filter(ad =>
        ad.creatorEmail === email && new Date(ad.expiryDate) > now
      );

      setPublishedCount(filteredCastings.length);
      setPostulationsCount(myPostulations.length);
      setActiveAdsCount(myAds.length);
      setMyCastings(filteredCastings);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#1A1A1A', '#000']} style={styles.gradientBackground}>
        <BackButton color="#fff" size={28} top={45} left={15} />
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>📊 Tu actividad reciente</Text>

          <View style={styles.filterRow}>
            <TouchableOpacity onPress={() => setFilter('7d')} style={[styles.filterButton, filter === '7d' && styles.filterSelected]}>
              <Text style={styles.filterText}>Últimos 7 días</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('30d')} style={[styles.filterButton, filter === '30d' && styles.filterSelected]}>
              <Text style={styles.filterText}>30 días</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterButton, filter === 'all' && styles.filterSelected]}>
              <Text style={styles.filterText}>Todos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bubble}>
            <Ionicons name="film-outline" size={34} color="#4DA6FF" />
            <Text style={styles.bubbleNumber}>{publishedCount.toLocaleString('es-CL')}</Text>
            <Text style={styles.bubbleLabel}>Castings publicados</Text>
          </View>

          <View style={styles.bubble}>
            <Ionicons name="people-outline" size={34} color="#4CAF50" />
            <Text style={styles.bubbleNumber}>{postulationsCount.toLocaleString('es-CL')}</Text>
            <Text style={styles.bubbleLabel}>Postulaciones recibidas</Text>
          </View>

          <View style={styles.bubble}>
            <Ionicons name="megaphone-outline" size={34} color="#FF7043" />
            <Text style={styles.bubbleNumber}>{activeAdsCount.toLocaleString('es-CL')}</Text>
            <Text style={styles.bubbleLabel}>Anuncios activos</Text>
          </View>

          <View style={{ height: 1, backgroundColor: '#333', width: '100%', marginVertical: 25 }} />

          <TouchableOpacity
            style={styles.viewPostulationsButton}
            onPress={() => {
              if (myCastings.length > 0) {
                // Scroll directo o ya visible
              }
            }}
          >
            <Ionicons name="analytics-outline" size={20} color="#000" />
            <Text style={styles.viewPostulationsText}>Ver postulaciones por casting</Text>
          </TouchableOpacity>

          {myCastings.length === 0 ? (
            <Text style={styles.emptyText}>No se encontraron castings.</Text>
          ) : (
            myCastings.map((casting, index) => (
              <TouchableOpacity
                key={index}
                style={styles.castingCard}
                onPress={() =>
                  navigation.navigate('ViewApplications', {
                    castingId: casting.id,
                    castingTitle: casting.title,
                  })
                }
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="videocam-outline" size={22} color="#D8A353" style={{ marginRight: 10 }} />
                  <View>
                    <Text style={styles.castingTitle}>{casting.title || 'Sin título'}</Text>
                    <Text style={styles.castingDetail}>📅 {casting.createdAt || 'Sin fecha'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.aiSummaryButton} disabled>
            <Ionicons name="bulb-outline" size={20} color="#fff" />
            <Text style={styles.aiSummaryText}>Resumen con IA (próximamente)</Text>
          </TouchableOpacity>

          <Text style={styles.lastUpdated}>
            🔄 Última actualización:{' '}
            {new Date().toLocaleDateString('es-CL', {
              day: '2-digit',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D8A353',
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    width: '100%',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  filterText: {
    color: '#ccc',
    fontSize: 12,
  },
  filterSelected: {
    backgroundColor: '#D8A353',
  },
  bubble: {
    backgroundColor: '#1E1E1E',
    borderRadius: 80,
    paddingVertical: 24,
    paddingHorizontal: 30,
    marginBottom: 20,
    alignItems: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  bubbleNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  bubbleLabel: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  viewPostulationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  viewPostulationsText: {
    color: '#000',
    fontWeight: '600',
    marginLeft: 10,
  },
  castingCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#333',
  },
  castingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  castingDetail: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 4,
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
  aiSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 20,
    opacity: 0.5,
  },
  aiSummaryText: {
    color: '#ccc',
    marginLeft: 10,
    fontSize: 12,
    fontStyle: 'italic',
  },
  lastUpdated: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
  },
});
