// DEBUG: Ver qué hay realmente en MONGODB_URI
console.log('🔍 DEBUG MONGODB_URI:');
console.log('Longitud:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 'undefined');
console.log('Primeros 20 caracteres:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) : 'undefined');
console.log('¿Comienza con mongodb?:', process.env.MONGODB_URI ? process.env.MONGODB_URI.startsWith('mongodb') : 'undefined');

// Si no existe MONGODB_URI, usa la cadena por defecto PERO BIEN ESCRITA
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Armandopando:Nino.1412@cluster0.pmy61xe.mongodb.net/sistema_cobranza?retryWrites=true&w=majority';

console.log('🔍 URI que se usará:');
console.log('Primeros 30 chars:', MONGODB_URI.substring(0, 30));
