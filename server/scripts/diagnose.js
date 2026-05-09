#!/usr/bin/env node

/**
 * Диагностический скрипт для проверки PostgreSQL и Express сервера
 * Использование: node diagnose.js
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/loyalty_app';

console.log('🔍 Диагностика Loyalty App PostgreSQL Setup\n');
console.log('='.repeat(50));

// Шаг 1: Проверка переменных окружения
console.log('\n✓ Шаг 1: Проверка переменных окружения');
console.log(`  DATABASE_URL: ${DATABASE_URL ? '✅ установлена' : '❌ не установлена'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  PORT: ${process.env.PORT || 5002}`);
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '✅ установлен' : '❌ не установлен'}`);

// Шаг 2: Проверка подключения к БД
console.log('\n✓ Шаг 2: Проверка подключения к PostgreSQL...');

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

sequelize.authenticate()
  .then(() => {
    console.log('  ✅ Подключение к PostgreSQL успешно!');

    // Шаг 3: Проверка таблиц
    console.log('\n✓ Шаг 3: Проверка таблиц в БД...');

    return sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
  })
  .then(([tables]) => {
    const tableNames = tables.map(t => t.table_name).sort();
    
    if (tableNames.length === 0) {
      console.log('  ⚠️  БД пуста! Таблицы не найдены.');
      console.log('  Запустите: node seed.js');
    } else {
      console.log(`  ✅ Найдено ${tableNames.length} таблиц:`);
      tableNames.forEach(name => {
        console.log(`     - ${name}`);
      });
    }

    // Шаг 4: Проверка пользователей
    console.log('\n✓ Шаг 4: Проверка пользователей...');

    return sequelize.query('SELECT COUNT(*) as count FROM users');
  })
  .then(([result]) => {
    const count = result[0].count;
    console.log(`  ✅ Пользователей в БД: ${count}`);

    if (count === 0) {
      console.log('  ⚠️  Нет пользователей. Запустите: node seed.js');
    } else {
      return sequelize.query('SELECT email, role FROM users LIMIT 5');
    }
  })
  .then((result) => {
    if (result && result[0] && result[0].length > 0) {
      console.log('  Первые пользователи:');
      result[0].forEach(user => {
        console.log(`     - ${user.email} (${user.role})`);
      });
    }

    // Шаг 5: Проверка объектов
    console.log('\n✓ Шаг 5: Проверка объектов недвижимости...');

    return sequelize.query('SELECT COUNT(*) as count FROM properties');
  })
  .then(([result]) => {
    const count = result[0].count;
    console.log(`  ✅ Объектов в БД: ${count}`);

    if (count === 0) {
      console.log('  ⚠️  Нет объектов. Запустите: node seed.js');
    }

    // Шаг 6: Результаты
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА\n');
    console.log('Следующие шаги:');
    console.log('  1. Если таблицы/данные не найдены → node seed.js');
    console.log('  2. Запустить сервер → npm start');
    console.log('  3. Протестировать API → curl http://localhost:5002/health');
    console.log('');

    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ ОШИБКА:\n');
    console.error('Сообщение:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Подсказка: PostgreSQL не запущена или неверные параметры подключения.');
      console.error('   1. Убедитесь что PostgreSQL запущена');
      console.error('   2. Проверьте DATABASE_URL в файле .env');
      console.error('   3. Проверьте что база "loyalty_app" создана');
    }

    console.error('\nДля справки: DATABASE_URL = ' + DATABASE_URL);
    process.exit(1);
  });
