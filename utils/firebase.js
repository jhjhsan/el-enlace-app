import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

export const savePostToDatabase = async (post) => {
  try {
    const id = uuidv4(); // genera un ID único
    const newPost = { id, ...post };
    const existingPosts = await AsyncStorage.getItem('posts');
    const parsed = existingPosts ? JSON.parse(existingPosts) : [];
    parsed.push(newPost);
    await AsyncStorage.setItem('posts', JSON.stringify(parsed));
    console.log('Publicación guardada correctamente');
  } catch (error) {
    console.error('Error guardando publicación:', error);
  }
};
