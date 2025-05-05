import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { useUser } from '../contexts/UserContext';
import BottomBar from '../components/BottomBar';
import { saveUserProfile } from '../utils/profileStorage';

export default function CompleteFreeScreen({ navigation }) {
  const { setUserData } = useUser();

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [age, setAge] = useState('');
  const [region, setRegion] = useState('');
  const [sex, setSex] = useState(null);
  const [ethnicity, setEthnicity] = useState(null);
  const [bookPhotos, setBookPhotos] = useState([]);

  const [openSex, setOpenSex] = useState(false);
  const [openEthnicity, setOpenEthnicity] = useState(false);

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const pickBookPhotos = async () => {
    if (bookPhotos.length >= 3) {
      alert('Solo puedes subir hasta 3 fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((asset) => asset.uri);
      const totalFotos = [...bookPhotos, ...uris].slice(0, 3);
      setBookPhotos(totalFotos);
    }
  };

  const handleSave = async () => {
    if (!name || !email || !description || !profilePhoto || !age || !sex || !ethnicity || !region) {
      Alert.alert('Completa los campos obligatorios');
      return;
    }

    const profileData = {
      name,
      email,
      description,
      age,
      sex,
      ethnicity,
      region,
      profilePhoto,
      bookPhotos,
    };

    const success = await saveUserProfile(profileData, 'free', setUserData);

    if (success) {
      navigation.replace('Profile');
    } else {
      Alert.alert('Error al guardar', 'Ocurrió un error al guardar el perfil.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.placeholderText}>Agregar Foto de Perfil</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nombre completo*"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email*"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Edad*"
          placeholderTextColor="#aaa"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        <DropDownPicker
          open={openSex}
          setOpen={setOpenSex}
          value={sex}
          setValue={setSex}
          items={[
            { label: 'Hombre', value: 'hombre' },
            { label: 'Mujer', value: 'mujer' },
            { label: 'Otro / Prefiere no decirlo', value: 'otro' },
          ]}
          placeholder="Selecciona tu sexo*"
          style={styles.dropdown}
          dropDownContainerStyle={{ backgroundColor: '#1B1B1B' }}
          textStyle={{ color: '#fff' }}
          containerStyle={{ width: '80%', marginBottom: 10 }}
        />

        <DropDownPicker
          open={openEthnicity}
          setOpen={setOpenEthnicity}
          value={ethnicity}
          setValue={setEthnicity}
          items={[
            { label: 'Afrodescendiente', value: 'afrodescendiente' },
            { label: 'Caucásico', value: 'caucasico' },
            { label: 'Latino', value: 'latino' },
            { label: 'Asiático', value: 'asiatico' },
            { label: 'Indígena', value: 'indigena' },
            { label: 'Otro', value: 'otro' },
          ]}
          placeholder="Selecciona tu etnia*"
          style={styles.dropdown}
          dropDownContainerStyle={{ backgroundColor: '#1B1B1B' }}
          textStyle={{ color: '#fff' }}
          containerStyle={{ width: '80%', marginBottom: 10 }}
        />

        <TextInput
          style={styles.input}
          placeholder="Región / Ciudad*"
          placeholderTextColor="#aaa"
          value={region}
          onChangeText={setRegion}
        />

        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Descripción*"
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={styles.bookButton} onPress={pickBookPhotos}>
          <Text style={styles.bookButtonText}>Agregar fotos al Book (máx. 3)</Text>
        </TouchableOpacity>

        <View style={styles.gallery}>
          {bookPhotos.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.galleryImage} />
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar Perfil</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomBar membershipType="free" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    alignItems: 'center',
    paddingBottom: 100,
    paddingTop: 40,
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1B1B1B',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 15,
  },
  placeholderText: {
    color: '#CCCCCC',
    textAlign: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#D8A353',
    borderWidth: 2,
    marginBottom: 15,
  },
  input: {
    width: '80%',
    backgroundColor: '#1B1B1B',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D8A353',
  },
  dropdown: {
    backgroundColor: '#1B1B1B',
    borderColor: '#D8A353',
    borderRadius: 10,
  },
  bookButton: {
    backgroundColor: '#D8A353',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  bookButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#D8A353',
    paddingVertical: 15,
    borderRadius: 10,
    width: '80%',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  galleryImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
});
