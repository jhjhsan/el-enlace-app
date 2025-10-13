// screens/UpdateRequired.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { openStore } from '../utils/forceUpdate';

export default function UpdateRequired() {
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true); // bloquea back
    return () => sub.remove();
  }, []);
  return (
    <View style={s.c}>
      <Text style={s.h1}>Actualización requerida</Text>
      <Text style={s.p}>Hay una nueva versión de El Enlace. Actualiza para continuar.</Text>
      <TouchableOpacity style={s.btn} onPress={openStore}>
        <Text style={s.bt}>Actualizar ahora</Text>
      </TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({
  c:{flex:1,backgroundColor:'#000',alignItems:'center',justifyContent:'center',padding:24},
  h1:{color:'#fff',fontSize:22,fontWeight:'700',marginBottom:12,textAlign:'center'},
  p:{color:'#bbb',textAlign:'center',marginBottom:24},
  btn:{backgroundColor:'#D8A353',paddingVertical:12,paddingHorizontal:24,borderRadius:10},
  bt:{color:'#000',fontWeight:'700'}
});
