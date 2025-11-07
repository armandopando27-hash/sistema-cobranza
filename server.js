const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const app = express();

app.use(express.json());

// CONEXIÓN A MONGODB ATLAS
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Armandopando:TU_PASSWORD@cluster0.pmy61xe.mongodb.net/sistema_cobranza?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas - Sistema de Cobranza'))
  .catch(err => console.error('❌ Error conexión MongoDB:', err));

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

// SERVICIO DE NOTIFICACIONES (SIMULADO POR AHORA)
class NotificacionService {
  async enviarSMS(celular, mensaje) {
    console.log(`📱 SMS SIMULADO a ${celular}: ${mensaje}`);
    // Luego integraremos Twilio real
    return true;
  }
  
  async enviarEmail(email, asunto, mensaje) {
    console.log(`📧 EMAIL SIMULADO a ${email}: ${asunto} - ${mensaje}`);
    // Luego integraremos SendGrid real
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
    const clientes = await Cliente.find({ estado: 'activo' });
    let notificacionesEnviadas = 0;
    
    for (const cliente of clientes) {
      const { diasFaltantes } = calcularVencimientos(cliente.fecha_contrato);
      
      if ([3, 1, 0].includes(diasFaltantes)) {
        const mensaje = notificacionService.generarMensaje(cliente, diasFaltantes);
        
        if (mensaje) {
          // Enviar SMS si está activo
          if (cliente.notificaciones.sms && cliente.celular) {
            await notificacionService.enviarSMS(cliente.celular, mensaje);
          }
          
          // Enviar Email si está activo
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

// Crear cliente nuevo
app.post('/clientes', async (req, res) => {
  try {
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
    <p>Endpoints disponibles:</p>
    <ul>
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
});
