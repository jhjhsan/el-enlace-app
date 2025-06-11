import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackButton from '../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCastingsFromFirestore } from '../src/firebase/helpers/getCastingsFromFirestore';
import { getPostulationsFromFirestore } from '../src/firebase/helpers/getPostulationsFromFirestore';

export default function StatsEliteScreen() {
  const [publishedCount, setPublishedCount] = useState(0);
  const [postulationsCount, setPostulationsCount] = useState(0);
  const [activeAdsCount, setActiveAdsCount] = useState(0);
  const [castingSummary, setCastingSummary] = useState([]);
  const [filter, setFilter] = useState('all'); // '7d', '30d', 'all'
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadStats();
  }, [filter]);

  const loadStats = async () => {
    try {
      const userData = JSON.parse(await AsyncStorage.getItem('userData'));
      const email = userData?.email;

     const allCastings = await getCastingsFromFirestore(email);
     const allPostulations = await getPostulationsFromFirestore(email);

      const adsData = JSON.parse(await AsyncStorage.getItem('adsData')) || [];
      const now = new Date();

      const myCastings = allCastings.filter(c => c.creatorEmail === email);

      const filteredCastings = myCastings.filter(c => {
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

      const summary = filteredCastings.map(casting => {
        const postulations = allPostulations.filter(p => p.castingId === casting.id);
        return {
          title: casting.title || 'Casting sin título',
          date: casting.createdAt || 'Sin fecha',
          total: postulations.length,
        };
      });

      setCastingSummary(summary);
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
            <Text style={styles.bubbleNumber}>{publishedCount}</Text>
            <Text style={styles.bubbleLabel}>Castings publicados</Text>
          </View>

          <View style={styles.bubble}>
            <Ionicons name="people-outline" size={34} color="#4CAF50" />
            <Text style={styles.bubbleNumber}>{postulationsCount}</Text>
            <Text style={styles.bubbleLabel}>Postulaciones recibidas</Text>
          </View>

          <View style={styles.bubble}>
            <Ionicons name="megaphone-outline" size={34} color="#FF7043" />
            <Text style={styles.bubbleNumber}>{activeAdsCount}</Text>
            <Text style={styles.bubbleLabel}>Anuncios activos</Text>
          </View>

          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => {
              setModalVisible(true);
              // FUTURO: aquí se puede integrar exportación a PDF o Excel
              // usando librerías como react-native-html-to-pdf o expo-print
            }}
          >
            <Text style={styles.reportButtonText}>📄 Ver informe de postulaciones</Text>
          </TouchableOpacity>

          <Text style={styles.subtitle}>📋 Resumen por casting</Text>
          {castingSummary.length === 0 ? (
            <Text style={styles.emptyText}>No se encontraron castings.</Text>
          ) : (
            castingSummary.map((item, index) => (
              <View key={index} style={styles.castingCard}>
                <Text style={styles.castingTitle}>🎬 {item.title}</Text>
                <Text style={styles.castingDetail}>📅 {item.date}</Text>
                <Text style={styles.castingDetail}>👥 Postulaciones: {item.total}</Text>
              </View>
            ))
          )}

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

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Informe de Postulaciones</Text>
            <Text style={styles.modalText}>
              Casting: "Actores para comercial{'\n'}"
              Fecha: 10/05/2025{'\n'}
              Postulaciones: 12
            </Text>
            <Text style={styles.modalText}>
              Casting: "Modelo editorial{'\n'}"
              Fecha: 08/05/2025{'\n'}
              Postulaciones: 7
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={{ color: '#000000', fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  reportButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 20,
  },
  reportButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D8A353',
    alignSelf: 'flex-start',
    marginTop: 30,
    marginBottom: 10,
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
  lastUpdated: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  modalText: {
    color: '#333333',
    marginBottom: 8,
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#D8A353',
    padding: 10,
    borderRadius: 10,
    alignSelf: 'center',
  },
});
