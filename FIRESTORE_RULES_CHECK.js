// Проверка и исправление Firestore Security Rules

// ТЕКУЩЕЕ СОСТОЯНИЕ:
// Если у вас в Firebase Console Rules установлены только для чтения или есть ограничения,
// то операция записи может в итоге таймаутить.

// РЕКОМЕНДУЕМЫЕ ПРАВИЛА ДЛЯ РАЗРАБОТКИ:
// 
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // Разрешить любые операции для авторизованных пользователей
//     match /{document=**} {
//       allow read, write: if request.auth != null;
//     }
//   }
// }
//
// ЭТО ПРАВИЛО РАЗРЕШАЕТ:
// - Читать все документы, если пользователь авторизован
// - Писать все документы, если пользователь авторизован
// - Удалять документы, если пользователь авторизован
//
// ВНИМАНИЕ: Это правило не рекомендуется для продакшена!
// Для продакшена используйте более строгие правила.

// БОЛЕЕ СТРОГИЕ ПРАВИЛА ДЛЯ РАЗРАБОТКИ:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // Администраторы имеют полный доступ
//     match /{document=**} {
//       allow read, write: if request.auth != null && 
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
//     }
//     
//     // Обычные пользователи могут читать события
//     match /events/{document=**} {
//       allow read: if request.auth != null;
//       allow create, update, delete: if request.auth != null && 
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
//     }
//     
//     // Пользователи могут читать и редактировать только свои данные
//     match /users/{userId} {
//       allow read, write: if request.auth.uid == userId;
//     }
//   }
// }

// ПРОВЕРКА RULES В FIREBASE CONSOLE:
// 1. Откройте https://console.firebase.google.com/
// 2. Выберите ваш проект
// 3. Перейдите в Firestore Database -> Rules
// 4. Проверьте, что правила позволяют писать в 'events'
// 5. Нажмите "Publish" для применения правил

// ОТЛАДКА ПРОБЛЕМ С RULES:
// Если ошибка: "Missing or insufficient permissions"
// - Это означает, что Rules блокируют запись
// - Используйте более простые Rules во время разработки
// - Проверьте, что пользователь авторизован (request.auth != null)

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ПРОВЕРКА FIRESTORE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Если вы видите ошибку "A network error", сначала проверьте:

1. ✅ Авторизация:
   - Пользователь должен быть залогинен
   - request.auth != null должен быть True

2. ✅ Firestore Rules:
   - Откройте Firebase Console -> Firestore -> Rules
   - Убедитесь, что правила позволяют писать в collection 'events'
   - Минимальное правило: 
     allow read, write: if request.auth != null;

3. ✅ Подключение к интернету:
   - Проверьте, что браузер подключен к интернету
   - Откройте https://www.google.com в новой вкладке

4. ✅ Firebase Project:
   - Убедитесь, что Firestore Database активна
   - Убедитесь, что проект не удален и не на паузе

5. ✅ браузер DevTools:
   - Откройте F12 -> Console
   - Ищите сообщения об ошибках
   - Ищите сообщения от "Missing or insufficient permissions"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
