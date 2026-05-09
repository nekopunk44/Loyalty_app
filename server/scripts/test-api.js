/**
 * Тестирование API эндпоинтов
 */

const http = require('http');

const tests = [
  {
    name: 'GET /health',
    method: 'GET',
    path: '/health',
  },
  {
    name: 'GET /api/properties',
    method: 'GET',
    path: '/api/properties',
  },
  {
    name: 'GET /api/properties/1',
    method: 'GET',
    path: '/api/properties/1',
  },
  {
    name: 'GET /api/bookings/property/1/booked-dates',
    method: 'GET',
    path: '/api/bookings/property/1/booked-dates',
  },
  {
    name: 'GET /api/bookings/user/test-user-1',
    method: 'GET',
    path: '/api/bookings/user/test-user-1',
  },
];

const makeRequest = (method, path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5002,
      path: path,
      method: method,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });
    req.setTimeout(3000);
    req.end();
  });
};

const runTests = async () => {
  console.log('🧪 Начинаю тестирование API...\n');

  for (const test of tests) {
    try {
      const result = await makeRequest(test.method, test.path);
      const body = JSON.parse(result.body);

      console.log(`✅ ${test.name}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(body).substring(0, 100)}...`);
      console.log();
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message || JSON.stringify(error)}`);
      console.log();
    }
  }

  console.log('🏁 Тестирование завершено!');
};

runTests();
