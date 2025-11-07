const { MongoClient } = require("mongodb");

// CADENA DE CONEXIÓN CORRECTA - USA LA QUE TE DA MONGODB ATLAS
const uri = "mongodb+srv://armandopando:TU_CONTRASEÑA_REAL@cluster0.pmy61xe.mongodb.net/sistema_cobranza?retryWrites=true&w=majority";

async function testConnection() {
    const client = new MongoClient(uri);

    try {
        console.log('🔄 Conectando a MongoDB...');
        await client.connect();

        console.log('✅ Conectado! Probando base de datos...');

        // Verificar que la base de datos existe
        const databases = await client.db().admin().listDatabases();
        console.log('📊 Bases de datos disponibles:');
        databases.databases.forEach(db => console.log(`   - ${db.name}`));

        // Probar tu base de datos específica
        const db = client.db('sistema_cobranza');
        const collections = await db.listCollections().toArray();
        console.log('📁 Colecciones en sistema_cobranza:');
        collections.forEach(col => console.log(`   - ${col.name}`));

        console.log('🎉 ¡Conexión exitosa!');

    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        console.log('🔧 Posibles soluciones:');
        console.log('   1. Verificar usuario/contraseña');
        console.log('   2. Agregar IP 0.0.0.0/0 en MongoDB Atlas');
        console.log('   3. Verificar nombre del cluster');
    } finally {
        await client.close();
    }
}

testConnection();
