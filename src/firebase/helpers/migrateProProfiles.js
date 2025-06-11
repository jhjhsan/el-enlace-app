import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
const db = getFirestore();

export const migrateProProfiles = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'profiles'));

    let migrated = 0;

    for (const document of snapshot.docs) {
      const data = document.data();

      if (data.membershipType === 'pro') {
        const id = document.id;
        await setDoc(doc(db, 'profilesPro', id), data);
        migrated++;
        console.log(`✅ Migrado: ${id}`);
      }
    }

    console.log(`🎉 Migración completada. Total perfiles 'pro' migrados: ${migrated}`);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
};
