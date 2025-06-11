import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';

export default function ProfileViewElite({ profile, navigation }) {
  return (
    <ScrollView
      style={{ backgroundColor: '#000' }}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Perfil de Agencia</Text>
          <Text style={styles.subtitle}>👑 Cuenta Elite</Text>
          {navigation && (
            <TouchableOpacity
              style={styles.editPill}
              onPress={() => navigation.navigate('EditProfileElite')}
            >
              <AntDesign name="edit" size={14} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.profileSection}>
          <View style={styles.logoContainer}>
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.iconFallback]}>
                <Ionicons name="image-outline" size={40} color="#D8A353" />
              </View>
            )}
          </View>

          {profile.companyType && (
            <View style={styles.categoryBadge}>
              <Feather name="briefcase" size={14} color="#D8A353" style={{ marginRight: 6 }} />
              <Text style={styles.categoryText}>{profile.companyType}</Text>
            </View>
          )}

          {profile.agencyName && <Text style={styles.agencyName}>{profile.agencyName}</Text>}
          {profile.representative && <Text style={styles.representative}>{profile.representative}</Text>}
          {(profile.city || profile.region || profile.comuna) && (
            <Text style={styles.location}>
              {profile.city || 'Ciudad'}, {profile.region || 'Región'}
              {profile.comuna ? `, ${profile.comuna}` : ''}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Contacto</Text>
        <View style={styles.contactBoxCentered}>
          {profile.email && (
            <View style={styles.contactCard}>
              <Ionicons name="mail" size={18} color="#D8A353" style={styles.cardIcon} />
              <Text style={styles.cardText}>{profile.email}</Text>
            </View>
          )}
          {profile.phone && (
            <View style={styles.contactCard}>
              <Ionicons name="call" size={18} color="#D8A353" style={styles.cardIcon} />
              <Text style={styles.cardText}>{profile.phone}</Text>
            </View>
          )}
          {profile.address && (
            <View style={styles.contactCard}>
              <Ionicons name="location" size={18} color="#D8A353" style={styles.cardIcon} />
              <Text style={styles.cardText}>{profile.address}</Text>
            </View>
          )}
          {profile.instagram && (
            <View style={styles.contactCard}>
              <Ionicons name="logo-instagram" size={18} color="#D8A353" style={styles.cardIcon} />
              <Text style={styles.cardText}>{profile.instagram}</Text>
            </View>
          )}
          {profile.whatsapp && (
            <View style={styles.contactCard}>
              <Ionicons name="logo-whatsapp" size={18} color="#D8A353" style={styles.cardIcon} />
              <Text style={styles.cardText}>{profile.whatsapp}</Text>
            </View>
          )}
         {profile.webLink?.trim().length > 0 && (
  <TouchableOpacity
    style={styles.contactCard}
    onPress={() => Linking.openURL(profile.webLink)}
  >
    <Ionicons name="link-outline" size={18} color="#D8A353" style={styles.cardIcon} />
    <Text style={[styles.cardText, { textDecorationLine: 'underline' }]}>
      {profile.webLink}
    </Text>
  </TouchableOpacity>
)}

        </View>

        <Text style={styles.sectionTitle}>Descripción</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{profile.description}</Text>
        </View>

        <Text style={styles.sectionTitle}>Galería de trabajos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContainer}>
          {profile.logos?.map((uri, index) => (
            <TouchableOpacity key={index} style={styles.portfolioCard}>
              <Image source={{ uri }} style={styles.portfolioImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {profile.profileVideo && (
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>🎥Presentación audiovisual</Text>
            <View style={styles.videoPreviewContainer}>
              <Video
                source={{ uri: profile.profileVideo }}
                useNativeControls
                resizeMode="contain"
                style={styles.videoPreview}
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    backgroundColor: '#000',
    paddingBottom: 150,
    paddingHorizontal: 20,
    paddingTop: 35,
    alignItems: 'center',
  },
  inner: { width: '100%', alignItems: 'center' },
  headerContainer: { marginTop: 20, alignItems: 'center', marginBottom: 20 },
  title: { color: '#D8A353', fontSize: 20, fontWeight: 'bold', textTransform: 'uppercase' },
  subtitle: { color: '#D8A353', fontSize: 16, marginTop: 0, marginBottom: -15, fontWeight: '600' },
  editPill: {
    position: 'absolute', top: 0, left: 230, paddingVertical: 5,
    paddingHorizontal: 12, borderRadius: 30, backgroundColor: '#D8A353'
  },
  profileSection: { alignItems: 'center', marginVertical: 0 },
  logoContainer: {
    backgroundColor: '#1B1B1B', borderRadius: 75, padding: 8,
    borderWidth: 0.5, borderColor: '#D8A353'
  },
  logo: { width: 110, height: 110, borderRadius: 60, borderWidth: 0.5, borderColor: '#D8A353' },
  agencyName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 0 },
  representative: { color: '#CCCCCC', fontSize: 14, marginTop: 0 },
  location: { color: '#888888', fontSize: 13, marginTop: 0, marginBottom: 10, fontStyle: 'italic' },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    backgroundColor: '#1B1B1B', borderWidth: 0.5, borderColor: '#D8A353',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10
  },
  categoryText: { color: '#D8A353', fontSize: 14 },
  iconFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B1B1B' },
  sectionTitle: { color: '#D8A353', fontSize: 18, fontWeight: '600', marginVertical: 14 },
  contactBoxCentered: { alignItems: 'center', gap: 6, width: '100%' },
  contactCard: {
    backgroundColor: '#1B1B1B', borderRadius: 8, paddingVertical: 10,
    paddingHorizontal: 15, minWidth: '100%', flexDirection: 'row', alignItems: 'center'
  },
  cardIcon: { marginRight: 10 },
  cardText: { color: '#CCCCCC', fontSize: 14 },
  descriptionBox: { backgroundColor: '#1B1B1B', borderRadius: 10, padding: 16, width: '100%' },
  descriptionText: { color: '#CCCCCC', fontSize: 14, lineHeight: 20, textAlign: 'justify' },
  galleryContainer: {
    paddingHorizontal: 10,
  },
  portfolioCard: {
    marginRight: 10, borderRadius: 8, overflow: 'hidden',
    backgroundColor: '#1B1B1B', borderWidth: 0.5, borderColor: '#D8A353'
  },
  portfolioImage: { width: 100, height: 140, borderRadius: 8 },
  videoSection: { marginVertical: 20, width: '100%', alignItems: 'center' },
  videoPreviewContainer: {
    width: '90%', backgroundColor: '#1B1B1B', borderRadius: 10,
    borderWidth: 1, borderColor: '#D8A353', padding: 10, alignItems: 'center'
  },
  videoPreview: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#000' },
});
