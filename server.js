const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const app = express();

app.use(express.json());


// DEBUG: Ver qué hay realmente
console.log('🔍 DEBUG MONGODB_URI CONTENIDO:');
console.log('Valor completo:', process.env.MONGODB_URI);
console.log('Primeros 30 chars:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) : 'undefined');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Armandopando:Mongo123@cluster0.pmy6lxe.mongodb.net/sistema_cobranza?retryWrites=true&w=majority&appName=Cluster0";

console.log('🔧 Iniciando conexión a MongoDB...');
console.log('📡 URI de conexión:', MONGODB_URI ? '✅ Presente' : '❌ Faltante');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
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

// EVENTOS DE CONEXIÓN
mongoose.connection.on('connecting', () => {
  console.log('🔄 Conectando a MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ Conexión a MongoDB establecida');
});

mongoose.connection.on('error', (err) => {
  console.error('💥 Error de MongoDB:', err.message);
});

// MANTENER LA APLICACIÓN CORRIENDO
process.on('uncaughtException', (error) => {
  console.error('💥 Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rechazada:', reason);
});

// MODELO CLIENTE
const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  celular: { type: String, required: true },
  email: String,
  fecha_contrato: { type: Date, default: Date.now },
  deuda_actual: { type: Number, default: 40 },
  estado: { type: String, default: 'activo' },
  notificaciones: {
    sms: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    dias_recordatorio: { type: [Number], default: [3, 1, 0] }
  }
}, { timestamps: true });

const Cliente = mongoose.model('Cliente', clienteSchema);

// FUNCIÓN PARA VERIFICAR ESTADO DE LA BASE DE DATOS
async function verificarEstadoDB() {
  try {
    const estado = mongoose.connection.readyState;
    const estados = {
      0: '❌ Desconectado',
      1: '✅ Conectado',
      2: '🔄 Conectando',
      3: '⚠️  Desconectando'
    };
    
    console.log('📊 Estado de MongoDB:', estados[estado]);
    
    if (estado === 1) {
      const count = await Cliente.countDocuments();
      console.log(`📈 Clientes en base de datos: ${count}`);
    }
    
    return estado === 1;
  } catch (error) {
    console.error('❌ Error verificando estado DB:', error.message);
    return false;
  }
}

// FUNCIÓN PARA CALCULAR VENCIMIENTOS
function calcularVencimientos(fechaContrato) {
  const hoy = new Date();
  const diaPago = new Date(fechaContrato);
  diaPago.setMonth(hoy.getMonth());
  
  if (hoy > diaPago) {
    diaPago.setMonth(hoy.getMonth() + 1);
  }
  
  const diasFaltantes = Math.ceil((diaPago - hoy) / (1000 * 60 * 60 * 24));
  
  return {
    diaPago: diaPago,
    diasFaltantes: diasFaltantes
  };
}

// SERVICIO DE NOTIFICACIONES (SIMULADO)
class NotificacionService {
  async enviarSMS(celular, mensaje) {
    console.log(`📱 SMS SIMULADO a ${celular}: ${mensaje}`);
    return true;
  }
  
  async enviarEmail(email, asunto, mensaje) {
    console.log(`📧 EMAIL SIMULADO a ${email}: ${asunto} - ${mensaje}`);
    return true;
  }
  
  generarMensaje(cliente, diasFaltantes) {
    if (diasFaltantes === 3) {
      return `Hola ${cliente.nombre}! Recordatorio: Tu pago de S/.${cliente.deuda_actual} vence en 3 días.`;
    } else if (diasFaltantes === 1) {
      return `Hola ${cliente.nombre}! Último recordatorio: Paga S/.${cliente.deuda_actual} mañana. Evita cortes.`;
    } else if (diasFaltantes === 0) {
      return `Hola ${cliente.nombre}! Hoy vence tu pago de S/.${cliente.deuda_actual}. Realiza tu pago ahora.`;
    }
    return null;
  }
}

const notificacionService = new NotificacionService();

// TAREA PROGRAMADA - Verifica vencimientos diariamente a las 9:00 AM
cron.schedule('0 9 * * *', async () => {
  console.log('🔔 Ejecutando verificación de vencimientos...');
  
  try {
    const dbOk = await verificarEstadoDB();
    if (!dbOk) {
      console.error('❌ Base de datos no disponible para notificaciones');
      return;
    }
    
    const clientes = await Cliente.find({ estado: 'activo' });
    let notificacionesEnviadas = 0;
    
    for (const cliente of clientes) {
      const { diasFaltantes } = calcularVencimientos(cliente.fecha_contrato);
      
      if ([3, 1, 0].includes(diasFaltantes)) {
        const mensaje = notificacionService.generarMensaje(cliente, diasFaltantes);
        
        if (mensaje) {
          if (cliente.notificaciones.sms && cliente.celular) {
            await notificacionService.enviarSMS(cliente.celular, mensaje);
          }
          
          if (cliente.notificaciones.email && cliente.email) {
            await notificacionService.enviarEmail(
              cliente.email, 
              'Recordatorio de Pago - Sistema Cobranza', 
              `<h1>Recordatorio de Pago</h1><p>${mensaje}</p>`
            );
          }
          
          notificacionesEnviadas++;
          console.log(`✅ Notificado: ${cliente.nombre} - ${diasFaltantes} días faltantes`);
        }
      }
    }
    
    console.log(`📊 Verificación completada: ${notificacionesEnviadas} notificaciones enviadas`);
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
});

// 📊 RUTAS DE LA API

// Ruta para verificar estado
app.get('/status', async (req, res) => {
  try {
    const dbConectada = await verificarEstadoDB();
    const estado = mongoose.connection.readyState;
    
    res.json({
      success: true,
      database: {
        connected: dbConectada,
        readyState: estado,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear cliente nuevo
app.post('/clientes', async (req, res) => {
  try {
    const dbOk = await verificarEstadoDB();
    if (!dbOk) {
      return res.status(500).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }
    
    const cliente = new Cliente(req.body);
    await cliente.save();
    res.json({ 
      success: true, 
      message: 'Cliente creado exitosamente', 
      cliente 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener todos los clientes
app.get('/clientes', async (req, res) => {
  try {
    const dbOk = await verificarEstadoDB();
    if (!dbOk) {
      return res.status(500).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }
    
    const clientes = await Cliente.find().sort({ nombre: 1 });
    res.json({
      success: true,
      count: clientes.length,
      clientes: clientes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Verificar vencimientos de un cliente
app.get('/clientes/:id/vencimiento', async (req, res) => {
  try {
    const dbOk = await verificarEstadoDB();
    if (!dbOk) {
      return res.status(500).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }
    
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente no encontrado' 
      });
    }
    
    const vencimiento = calcularVencimientos(cliente.fecha_contrato);
    
    res.json({
      success: true,
      cliente: cliente.nombre,
      diasFaltantes: vencimiento.diasFaltantes,
      diaPago: vencimiento.diaPago.toDateString(),
      deuda: cliente.deuda_actual,
      mensaje: `Pago de S/.${cliente.deuda_actual} vence en ${vencimiento.diasFaltantes} días`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Probar notificación manualmente
app.post('/test-notificacion/:id', async (req, res) => {
  try {
    const dbOk = await verificarEstadoDB();
    if (!dbOk) {
      return res.status(500).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }
    
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente no encontrado' 
      });
    }
    
    const mensaje = `🔔 PRUEBA: Hola ${cliente.nombre}, este es un mensaje de prueba del sistema.`;
    
    if (cliente.notificaciones.sms && cliente.celular) {
      await notificacionService.enviarSMS(cliente.celular, mensaje);
    }
    
    res.json({
      success: true,
      message: 'Notificación de prueba enviada',
      cliente: cliente.nombre,
      celular: cliente.celular
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Ruta de prueba del sistema
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 Sistema de Notificaciones - Cobranza</h1>
    <p><strong>Estado:</strong> ✅ Funcionando</p>
    <p><strong>Endpoints disponibles:</strong></p>
    <ul>
      <li><strong>GET /status</strong> - Verificar estado de conexión</li>
      <li><strong>GET /clientes</strong> - Ver todos los clientes</li>
      <li><strong>POST /clientes</strong> - Crear nuevo cliente</li>
      <li><strong>GET /clientes/:id/vencimiento</strong> - Ver vencimiento</li>
      <li><strong>POST /test-notificacion/:id</strong> - Probar notificación</li>
    </ul>
    <p>🔔 Las notificaciones automáticas se ejecutan todos los días a las 9:00 AM</p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎯 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Sistema de Cobranza inicializado`);
  console.log(`🔔 Notificaciones programadas: ACTIVAS`);
  
  // Verificar conexión al iniciar
  setTimeout(() => {
    verificarEstadoDB();
  }, 2000);
});
