import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const saveSuggestionToFirestore = async (
  email,
  suggestions,
  membershipType,
  verdict,
  completion,
  source = 'manual'
) => {
  try {
    const ref = collection(db, 'suggestionsHistory', email.toLowerCase(), 'entries');

    const data = {
      email,
      suggestions,
      membershipType,
      source,
      timestamp: Timestamp.now(),
    };

    if (verdict !== undefined) data.verdict = verdict;
    if (completion !== undefined) data.completion = completion;

    await addDoc(ref, data);
  } catch (err) {
    console.error('❌ Error al guardar sugerencias IA:', err);
  }
};
