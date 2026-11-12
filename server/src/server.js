const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Sweety backend server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = server;
