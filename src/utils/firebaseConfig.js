/**
 * Firebase Configuration
 * Для Expo Web: Эти значения жестко кодированы
 * Эти значения ПУБЛИЧНЫЕ и безопасны для браузера
 */

const firebaseConfig = {
  apiKey: 'AIzaSyC3jihs0FjEeiPAZLHSusCG49C6-zH34N8',
  authDomain: 'villa-jaconda-loyalty.firebaseapp.com',
  projectId: 'villa-jaconda-loyalty',
  storageBucket: 'villa-jaconda-loyalty.firebasestorage.app',
  messagingSenderId: '408293307028',
  appId: '1:408293307028:web:143ce88e9968cd6a5cfa81',
  measurementId: 'G-B4GN7RJ1XF',
};

console.log('🔧 Firebase config загружен:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

export default firebaseConfig;

// Firestore Database Rules (копировать в Firebase Console)
export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access on all documents to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Specific rules for Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid != null; // Other users can read profiles
    }
    
    // Specific rules for Properties collection (read-only for users)
    match /properties/{propertyId} {
      allow read: if request.auth != null;
      allow write: if hasRole('admin');
    }
    
    // Bookings rules (users can read/write their own)
    match /bookings/{bookingId} {
      allow read, write: if request.auth.uid == resource.data.userId || hasRole('admin');
    }
    
    // Reviews rules
    match /reviews/{reviewId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == request.resource.data.userId;
      allow delete: if request.auth.uid == resource.data.userId || hasRole('admin');
    }
    
    // Payments rules
    match /payments/{paymentId} {
      allow read, write: if request.auth.uid == resource.data.userId || hasRole('admin');
    }
    
    // Helper function to check user role
    function hasRole(role) {
      return request.auth.token.role == role;
    }
  }
}
`;

// Storage Bucket Rules (копировать в Firebase Console Storage Rules)
export const STORAGE_RULES = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload/download user-specific files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Allow anyone to read public files (reviews, profiles)
    match /public/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Admin uploads only
    match /admin/{allPaths=**} {
      allow read, write: if request.auth.token.role == 'admin';
    }
  }
}
`;

// Firebase Authentication Providers Configuration
export const AUTH_PROVIDERS = {
  EMAIL: 'password',
  GOOGLE: 'google.com',
  APPLE: 'apple.com',
  FACEBOOK: 'facebook.com',
};

// Firestore Collections Structure
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  PROPERTIES: 'properties',
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  LOYALTY_TIERS: 'loyaltyTiers',
  PROMOTIONS: 'promotions',
  EVENTS: 'events',
  FAQ: 'faq',
  SUPPORT_TICKETS: 'supportTickets',
  ANALYTICS: 'analytics',
};

// AsyncStorage Keys for Offline Support
export const STORAGE_KEYS = {
  USER: '@user',
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  THEME: '@theme',
  BOOKINGS_LOCAL: '@bookings_local',
  PAYMENTS_LOCAL: '@payments_local',
  NOTIFICATIONS_LOCAL: '@notifications_local',
  LAST_SYNC: '@last_sync',
  CACHE_USERS: '@cache_users',
  CACHE_PROPERTIES: '@cache_properties',
};

// Environment
export const ENV = {
  IS_DEV: process.env.NODE_ENV !== 'production',
  IS_PROD: process.env.NODE_ENV === 'production',
  API_URL: process.env.REACT_APP_API_URL || 'https://us-central1-villa-jaconda-loyalty.cloudfunctions.net',
};

// Firebase Cloud Functions Endpoints
export const CLOUD_FUNCTIONS = {
  CREATE_BOOKING: 'https://us-central1-villa-jaconda-loyalty.cloudfunctions.net/createBooking',
  PROCESS_PAYMENT: 'https://us-central1-villa-jaconda-loyalty.cloudfunctions.net/processPayment',
  SEND_NOTIFICATION: 'https://us-central1-villa-jaconda-loyalty.cloudfunctions.net/sendNotification',
  GENERATE_REPORT: 'https://us-central1-villa-jaconda-loyalty.cloudfunctions.net/generateReport',
  CALCULATE_LOYALTY: 'https://us-central1-villa-jaconda-loyalty.cloudfunctions.net/calculateLoyalty',
};
