const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Armandopando:Nino.1412@cluster0.pmy61xe.mongodb.net/sistema_cobranza?retryWrites=true&w=majority';

console.log('🔧 Iniciando conexión a MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 segundos
})
.then(() => {
  console.log('✅ Conectado a MongoDB Atlas - Sistema de Cobranza');
  console.log('🏠 Host:', mongoose.connection.host);
  console.log('📊 Base de datos:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ Error conexión MongoDB:', err.message);
  console.log('🔧 Continuando sin MongoDB...');
});

// MANTENER LA APLICACIÓN CORRIENDO AUN CON ERRORES
process.on('uncaughtException', (error) => {
  console.error('💥 Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rechazada:', reason);
});
