import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';

export default function CastingFilterBuilder() {
  const { userData } = useUser();
  const navigation = useNavigation();

  const [sex, setSex] = useState(null);
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [ethnicity, setEthnicity] = useState(null);
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');

  const [openEtnia, setOpenEtnia] = useState(false);
  const [openSexo, setOpenSexo] = useState(false);

  useEffect(() => {
    if (userData?.membershipType !== 'elite') {
      Alert.alert(
        'Función exclusiva',
        'Solo los usuarios Elite pueden usar filtros avanzados de casting.',
        [{ text: 'Ver planes', onPress: () => navigation.navigate('Subscription') }]
      );
      navigation.goBack();
    }
  }, [userData]);

  const etniaOptions = [
    { label: 'Afrodescendiente', value: 'afrodescendiente' },
    { label: 'Caucásico', value: 'caucasico' },
    { label: 'Latino', value: 'latino' },
    { label: 'Asiático', value: 'asiatico' },
    { label: 'Indígena', value: 'indigena' },
    { label: 'Otro', value: 'otro' },
  ];

  const sexoOptions = [
    { label: 'Hombre', value: 'hombre' },
    { label: 'Mujer', value: 'mujer' },
    { label: 'Otro / No especifica', value: 'otro' },
  ];

  const handleSave = async () => {
    if (!sex || !minAge || !maxAge || !ethnicity || !region) {
      Alert.alert('Campos requeridos', 'Completa todos los filtros principales.');
      return;
    }

    const filters = {
      sex,
      minAge: parseInt(minAge),
      maxAge: parseInt(maxAge),
      ethnicity,
      region,
      category,
      createdAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem('currentCastingFilters', JSON.stringify(filters));
      Alert.alert('✅ Filtros guardados', 'Ahora puedes buscar perfiles compatibles.');
      navigation.navigate('ExploreProfiles');
    } catch (error) {
      console.error('Error al guardar filtros:', error);
      Alert.alert('Error', 'No se pudieron guardar los filtros.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Flecha de volver */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🎯 Filtros del casting</Text>

        <DropDownPicker
          open={openSexo}
          setOpen={setOpenSexo}
          value={sex}
          setValue={setSex}
          items={sexoOptions}
          placeholder="Selecciona el sexo"
          containerStyle={{ marginBottom: 20 }}
          style={styles.dropdown}
          dropDownContainerStyle={{ backgroundColor: '#1A1A1A' }}
          textStyle={{ color: '#fff' }}
        />

        <TextInput
          placeholder="Edad mínima"
          placeholderTextColor="#888"
          style={styles.input}
          keyboardType="numeric"
          value={minAge}
          onChangeText={setMinAge}
        />

        <TextInput
          placeholder="Edad máxima"
          placeholderTextColor="#888"
          style={styles.input}
          keyboardType="numeric"
          value={maxAge}
          onChangeText={setMaxAge}
        />

        <DropDownPicker
          open={openEtnia}
          setOpen={setOpenEtnia}
          value={ethnicity}
          setValue={setEthnicity}
          items={etniaOptions}
          placeholder="Selecciona la etnia"
          containerStyle={{ marginBottom: 20 }}
          style={styles.dropdown}
          dropDownContainerStyle={{ backgroundColor: '#1A1A1A' }}
          textStyle={{ color: '#fff' }}
        />

        <TextInput
          placeholder="Región"
          placeholderTextColor="#888"
          style={styles.input}
          value={region}
          onChangeText={setRegion}
        />

        <TextInput
          placeholder="Categoría (opcional)"
          placeholderTextColor="#888"
          style={styles.input}
          value={category}
          onChangeText={setCategory}
        />

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>🔍 Buscar perfiles compatibles</Text>
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
  backButton: {
    position: 'absolute',
    top: 15,
    left: 20,
    zIndex: 10,
  },
  container: {
    padding: 20,
    paddingBottom: 140,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D8A353',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderColor: '#D8A353',
    borderWidth: 1,
  },
  dropdown: {
    backgroundColor: '#1A1A1A',
    borderColor: '#D8A353',
  },
  button: {
    backgroundColor: '#D8A353',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
