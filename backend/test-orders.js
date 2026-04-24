/* eslint-env node */
import http from 'http';

const data = JSON.stringify({
  email: 'nguyenvana@example.com',
  password: 'secretpassword123'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).token;
    console.log("Token:", token ? "OK" : "MISSING");
    
    // GET /orders
    http.get({
      hostname: 'localhost',
      port: 5000,
      path: '/orders',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      console.log("GET /orders status:", res2.statusCode);
    });

    // GET /orders/14
    http.get({
      hostname: 'localhost',
      port: 5000,
      path: '/orders/14',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res3) => {
      console.log("GET /orders/14 status:", res3.statusCode);
    });

    // GET /orders/14/delivery-events
    http.get({
      hostname: 'localhost',
      port: 5000,
      path: '/orders/14/delivery-events',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res4) => {
      console.log("GET /orders/14/delivery-events status:", res4.statusCode);
    });
  });
});
req.write(data);
req.end();
