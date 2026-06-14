//configuration  de la base de données


const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI); // plus d’options ici
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    const isRefused = /ECONNREFUSED|connect ECONNREFUSED/.test(error.message);
    console.error(`Erreur de connexion à la base de données: ${error.message}`);
    if (isRefused) {
      console.error('\n→ MongoDB ne tourne pas. Démarre-le :');
      console.error('  • Mac (Homebrew) : brew services start mongodb-community');
      console.error('  • Ou en une fois : mongod --dbpath /usr/local/var/mongodb');
      console.error('  • Voir : https://www.mongodb.com/docs/manual/installation/\n');
    }
    process.exit(1);
  }
};

module.exports = connectDB;