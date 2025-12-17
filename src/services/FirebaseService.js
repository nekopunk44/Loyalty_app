/**
 * Firebase Service
 * Централизованный сервис для работы с Firebase
 * Инициализация, Auth, Firestore, Storage
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getBytes,
  deleteObject,
  listAll,
} from 'firebase/storage';
import firebaseConfig from '../utils/firebaseConfig';

/**
 * Firebase App Initialization
 */
let app = null;
let auth = null;
let db = null;
let storage = null;

export const initializeFirebase = () => {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);

      console.log('✅ Firebase инициализирован успешно');
      return { app, auth, db, storage };
    } catch (error) {
      console.error('❌ Ошибка инициализации Firebase:', error);
      throw error;
    }
  }
  return { app, auth, db, storage };
};

/**
 * Authentication Methods
 */

// Регистрация по email
export const registerWithEmail = async (email, password, displayName) => {
  try {
    if (!auth) initializeFirebase();

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Обновляем профиль с именем
    await updateProfile(user, { displayName });

    console.log('✅ Пользователь зарегистрирован:', email);
    return user;
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error.message);
    throw error;
  }
};

// Вход по email и пароль
export const loginWithEmail = async (email, password) => {
  try {
    if (!auth) initializeFirebase();

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Пользователь вошёл:', email);
    return user;
  } catch (error) {
    console.error('❌ Ошибка входа:', error.message);
    throw error;
  }
};

// Выход
export const logout = async () => {
  try {
    if (!auth) initializeFirebase();

    await firebaseSignOut(auth);
    console.log('✅ Пользователь вышел из системы');
    return true;
  } catch (error) {
    console.error('❌ Ошибка выхода:', error.message);
    throw error;
  }
};

// Получить текущего пользователя
export const getCurrentUser = () => {
  if (!auth) initializeFirebase();
  return auth.currentUser;
};

// Слушать изменения состояния аутентификации
export const onAuthStateChange = (callback) => {
  if (!auth) initializeFirebase();

  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// Сброс пароля
export const sendPasswordReset = async (email) => {
  try {
    if (!auth) initializeFirebase();

    await sendPasswordResetEmail(auth, email);
    console.log('✅ Email для восстановления пароля отправлен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка сброса пароля:', error.message);
    throw error;
  }
};

// Обновить пароль
export const updateUserPassword = async (newPassword) => {
  try {
    if (!auth) initializeFirebase();
    const user = auth.currentUser;

    if (!user) throw new Error('Пользователь не авторизован');

    await updatePassword(user, newPassword);
    console.log('✅ Пароль обновлён');
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления пароля:', error.message);
    throw error;
  }
};

/**
 * Firestore Methods
 */

// Получить ссылку на документ
export const getDocRef = (collectionName, docId) => {
  if (!db) initializeFirebase();
  return doc(db, collectionName, docId);
};

// Получить ссылку на коллекцию
export const getColRef = (collectionName) => {
  if (!db) initializeFirebase();
  return collection(db, collectionName);
};

// Получить документ по ID
export const getDocument = async (collectionName, docId) => {
  try {
    if (!db) initializeFirebase();

    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    console.log(`⚠️ Документ не найден: ${collectionName}/${docId}`);
    return null;
  } catch (error) {
    console.error('❌ Ошибка получения документа:', error);
    throw error;
  }
};

// Создать/обновить документ
export const setDocument = async (collectionName, docId, data, merge = false) => {
  try {
    if (!db) initializeFirebase();

    const dataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (!merge) {
      dataWithTimestamp.createdAt = serverTimestamp();
    }

    await setDoc(doc(db, collectionName, docId), dataWithTimestamp, { merge });
    console.log(`✅ Документ сохранён: ${collectionName}/${docId}`);
    return docId;
  } catch (error) {
    console.error('❌ Ошибка сохранения документа:', error);
    throw error;
  }
};

// Обновить документ
export const updateDocument = async (collectionName, docId, data) => {
  try {
    if (!db) initializeFirebase();

    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, collectionName, docId), updateData);
    console.log(`✅ Документ обновлён: ${collectionName}/${docId}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка обновления документа:', error);
    throw error;
  }
};

// Удалить документ
export const deleteDocument = async (collectionName, docId) => {
  try {
    if (!db) initializeFirebase();

    await deleteDoc(doc(db, collectionName, docId));
    console.log(`✅ Документ удалён: ${collectionName}/${docId}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления документа:', error);
    throw error;
  }
};

// Запрос документов с условиями
export const queryDocuments = async (collectionName, conditions = []) => {
  try {
    if (!db) initializeFirebase();

    let q = collection(db, collectionName);

    if (conditions.length > 0) {
      q = query(q, ...conditions.map((c) => where(c.field, c.operator, c.value)));
    }

    const querySnapshot = await getDocs(q);
    const documents = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Получено ${documents.length} документов из ${collectionName}`);
    return documents;
  } catch (error) {
    console.error('❌ Ошибка запроса документов:', error);
    throw error;
  }
};

// Получить все документы коллекции
export const getAllDocuments = async (collectionName) => {
  try {
    if (!db) initializeFirebase();

    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Получено ${documents.length} документов из ${collectionName}`);
    return documents;
  } catch (error) {
    console.error('❌ Ошибка получения всех документов:', error);
    throw error;
  }
};

// Слушать изменения коллекции в реальном времени
export const onCollectionChange = (collectionName, callback, conditions = []) => {
  try {
    if (!db) initializeFirebase();

    let q = collection(db, collectionName);

    if (conditions.length > 0) {
      q = query(q, ...conditions.map((c) => where(c.field, c.operator, c.value)));
    }

    return onSnapshot(q, (snapshot) => {
      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      callback(documents);
    });
  } catch (error) {
    console.error('❌ Ошибка слушателя коллекции:', error);
    throw error;
  }
};

// Слушать изменения документа в реальном времени
export const onDocumentChange = (collectionName, docId, callback) => {
  try {
    if (!db) initializeFirebase();

    return onSnapshot(doc(db, collectionName, docId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  } catch (error) {
    console.error('❌ Ошибка слушателя документа:', error);
    throw error;
  }
};

// Пакетная операция (batch write)
export const batchWrite = async (operations) => {
  try {
    if (!db) initializeFirebase();

    const batch = writeBatch(db);

    operations.forEach(({ type, collection: collectionName, docId, data }) => {
      const docRef = doc(db, collectionName, docId);

      if (type === 'set') {
        batch.set(docRef, { ...data, updatedAt: serverTimestamp() });
      } else if (type === 'update') {
        batch.update(docRef, { ...data, updatedAt: serverTimestamp() });
      } else if (type === 'delete') {
        batch.delete(docRef);
      }
    });

    await batch.commit();
    console.log(`✅ Пакетная операция завершена (${operations.length} операций)`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка пакетной операции:', error);
    throw error;
  }
};

/**
 * Storage Methods
 */

// Загрузить файл
export const uploadFile = async (storagePath, file, fileName) => {
  try {
    if (!storage) initializeFirebase();

    const fileRef = ref(storage, `${storagePath}/${fileName}`);
    await uploadBytes(fileRef, file);

    console.log(`✅ Файл загружен: ${storagePath}/${fileName}`);
    return fileRef.fullPath;
  } catch (error) {
    console.error('❌ Ошибка загрузки файла:', error);
    throw error;
  }
};

// Получить файл
export const downloadFile = async (storagePath) => {
  try {
    if (!storage) initializeFirebase();

    const fileRef = ref(storage, storagePath);
    const data = await getBytes(fileRef);

    console.log(`✅ Файл загружен: ${storagePath}`);
    return data;
  } catch (error) {
    console.error('❌ Ошибка загрузки файла:', error);
    throw error;
  }
};

// Удалить файл
export const deleteFile = async (storagePath) => {
  try {
    if (!storage) initializeFirebase();

    await deleteObject(ref(storage, storagePath));
    console.log(`✅ Файл удалён: ${storagePath}`);
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления файла:', error);
    throw error;
  }
};

// Получить список файлов
export const listFiles = async (storagePath) => {
  try {
    if (!storage) initializeFirebase();

    const fileRef = ref(storage, storagePath);
    const result = await listAll(fileRef);

    const files = result.items.map((item) => item.name);
    console.log(`✅ Получен список файлов: ${files.length} файлов`);
    return files;
  } catch (error) {
    console.error('❌ Ошибка получения списка файлов:', error);
    throw error;
  }
};

/**
 * Utility Functions
 */

// Получить ID документа
export const generateDocId = (collectionName) => {
  if (!db) initializeFirebase();
  return doc(collection(db, collectionName)).id;
};

// Timestamp для сравнения дат
export const getTimestamp = () => {
  return Timestamp.now();
};

// Преобразовать Timestamp в Date
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
};

// Преобразовать Date в Timestamp
export const dateToTimestamp = (date) => {
  return Timestamp.fromDate(date instanceof Date ? date : new Date(date));
};

/**
 * Создание нового пользователя администратором
 * Создает учетную запись в Firebase Auth и профиль в Firestore
 */
export const createUserAsAdmin = async (userData) => {
  console.log('🚀 createUserAsAdmin вызвана с данными:', userData);
  
  try {
    const { email, password, displayName, phone, role = 'user', membershipLevel = 'Bronze' } = userData;
    console.log('📝 Распарсены данные:', { email, displayName, phone, role, membershipLevel });

    // 1. Создаем учетную запись в Firebase Auth
    console.log('🔑 Создание учетной записи в Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log('✅ Учетная запись создана в Auth:', firebaseUser.uid);

    // 2. Обновляем профиль с именем
    console.log('👤 Обновление профиля...');
    await updateProfile(firebaseUser, {
      displayName: displayName || email.split('@')[0],
    });
    console.log('✅ Профиль обновлен');

    // 3. Сохраняем роль в AsyncStorage как резервный вариант
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
      await AsyncStorage.setItem(`user-${firebaseUser.uid}-role`, role);
      console.log('✅ Роль сохранена в AsyncStorage:', role);
    } catch (storageErr) {
      console.warn('⚠️ Не удалось сохранить роль в AsyncStorage:', storageErr.message);
    }

    // 4. Создаем профиль пользователя в Firestore
    console.log('💾 Создание профиля в Firestore...');
    const userProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: displayName || email.split('@')[0],
      name: displayName || email.split('@')[0],
      phone: phone || '',
      address: '',
      avatar: null,
      role: role, // 'user', 'admin', 'manager', etc.
      status: 'active',
      membershipLevel: membershipLevel,
      loyaltyPoints: 0,
      totalSpent: 0,
      joinDate: serverTimestamp(),
      lastLogin: serverTimestamp(),
      metadata: {
        createdBy: 'admin',
        createdAt: serverTimestamp(),
      },
    };

    // 4.5 Сохраняем профиль в AsyncStorage
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
      await AsyncStorage.setItem(`user-${firebaseUser.uid}`, JSON.stringify(userProfile));
      console.log('✅ Профиль сохранён в AsyncStorage');
    } catch (storageErr) {
      console.warn('⚠️ Не удалось сохранить профиль в AsyncStorage:', storageErr.message);
    }

    await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
    console.log('✅ Профиль создан в Firestore:', firebaseUser.uid);

    const result = {
      uid: firebaseUser.uid,
      ...userProfile,
    };
    console.log('✅ Пользователь создан успешно:', result);
    return result;
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error);
    throw new Error(error.message || 'Ошибка при создании пользователя');
  }
};

/**
 * Получение всех пользователей (для администратора)
 */
export const getAllUsers = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return users;
  } catch (error) {
    console.error('❌ Ошибка при получении пользователей:', error);
    throw error;
  }
};

/**
 * Удаление пользователя (администратор)
 */
export const deleteUserAsAdmin = async (userId) => {
  try {
    // Удаляем профиль из Firestore
    await deleteDoc(doc(db, 'users', userId));
    console.log('✅ Профиль пользователя удален:', userId);
    
    // Примечание: для удаления учетной записи из Auth нужны admin SDK на backend
    // На frontend это невозможно сделать напрямую по соображениям безопасности
    return true;
  } catch (error) {
    console.error('❌ Ошибка при удалении пользователя:', error);
    throw error;
  }
};

/**
 * Обновление профиля пользователя (администратор)
 */
export const updateUserAsAdmin = async (userId, updates) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Профиль пользователя обновлен:', userId);
    return true;
  } catch (error) {
    console.error('❌ Ошибка при обновлении профиля:', error);
    throw error;
  }
};

export default {
  initializeFirebase,
  registerWithEmail,
  loginWithEmail,
  logout,
  getCurrentUser,
  onAuthStateChange,
  sendPasswordReset,
  updateUserPassword,
  getDocRef,
  getColRef,
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  getAllDocuments,
  onCollectionChange,
  onDocumentChange,
  batchWrite,
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles,
  generateDocId,
  getTimestamp,
  timestampToDate,
  dateToTimestamp,
  createUserAsAdmin,
  getAllUsers,
  deleteUserAsAdmin,
  updateUserAsAdmin,
};
