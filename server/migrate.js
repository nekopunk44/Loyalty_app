/**
 * Database Migration Script
 * Выполняет все необходимые миграции БД
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'zxckursed',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'loyalty_app',
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 5000,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Запуск миграций...\n');

    // Миграция 1: Добавление колонок saunaHours и kitchenware
    console.log('📝 Миграция 1: Добавление колонок к таблице bookings');
    const migration1SQL = `
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS sauna_hours INTEGER DEFAULT 0;
      
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS kitchenware BOOLEAN DEFAULT false;
    `;
    await client.query(migration1SQL);
    console.log('✅ Миграция 1 успешно применена!\n');

    // Миграция 2: Фиксирование столбца text в таблице reviews
    console.log('📝 Миграция 2: Фиксирование столбца text в таблице reviews');
    
    // Step 1: Add text column if not exists
    console.log('  Step 1: Добавляю столбец text...');
    await client.query(`
      ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS text TEXT DEFAULT '';
    `);
    
    // Step 2: Copy data from comment
    console.log('  Step 2: Копирую данные из comment...');
    await client.query(`
      UPDATE reviews SET text = COALESCE(comment, '') WHERE text IS NULL OR text = '';
    `);
    
    // Step 3: Add NOT NULL constraint
    console.log('  Step 3: Добавляю ограничение NOT NULL...');
    await client.query(`
      ALTER TABLE reviews
      ALTER COLUMN text SET NOT NULL;
    `);
    
    // Step 4: Remove NOT NULL from comment
    console.log('  Step 4: Убираю ограничение NOT NULL с comment...');
    await client.query(`
      ALTER TABLE reviews
      ALTER COLUMN comment DROP NOT NULL;
    `);

    console.log('✅ Миграция 2 успешно применена!\n');

    // Проверяем структуру таблиц
    const checkResult1 = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('sauna_hours', 'kitchenware')
      ORDER BY ordinal_position;
    `);

    const checkResult2 = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reviews' 
      AND column_name IN ('text', 'comment')
      ORDER BY ordinal_position;
    `);

    console.log('📊 Проверка структуры таблицы bookings:');
    if (checkResult1.rows.length > 0) {
      checkResult1.rows.forEach(col => {
        console.log(`   • ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'нет'})`);
      });
    } else {
      console.log('   (Колонки не найдены)');
    }

    console.log('\n📊 Проверка структуры таблицы reviews:');
    if (checkResult2.rows.length > 0) {
      checkResult2.rows.forEach(col => {
        console.log(`   • ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('   (Колонки не найдены)');
    }

    console.log('\n🎉 Все миграции успешно применены!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Ошибка при применении миграций:', error.message);
    console.error('SQL State:', error.code);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

// Set a timeout to prevent hanging
setTimeout(() => {
  console.error('❌ Timeout: Миграция заняла слишком много времени');
  process.exit(1);
}, 30000);

// Запускаем миграцию
runMigration().catch(err => {
  console.error('❌ Критическая ошибка:', err);
  process.exit(1);
});
