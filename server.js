const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const app = express();

app.use(express.json());

// CONEXIÓN A MONGODB ATLAS
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Armandopando:Mongo123@cluster0.pmy6lxe.mongodb.net/sistema_cobranza?retryWrites=true&w=majority&appName=Cluster0";

console.log('🔧 Iniciando conexión a MongoDB...');

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

// MODELO CLIENTE MEJORADO
const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  celular: { type: String, required: true },
  email: String,
  direccion: { type: String, required: true },
  ip: { type: String, required: true },
  mac: { type: String, required: true },
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

// TAREA PROGRAMADA
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

// Actualizar cliente existente
app.put('/clientes/:id', async (req, res) => {
  try {
    const dbOk = await verificarEstadoDB();
    if (!dbOk) {
      return res.status(500).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }
    
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Cliente actualizado exitosamente', 
      cliente 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Eliminar cliente
app.delete('/clientes/:id', async (req, res) => {
  try {
    const dbOk = await verificarEstadoDB();
    if (!dbOk) {
      return res.status(500).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }
    
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cliente no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Cliente eliminado exitosamente' 
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
      cliente: cliente.nombre + ' ' + cliente.apellido,
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

// Ruta de prueba del sistema
app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 Sistema de Notificaciones - Cobranza</h1>
    <p><strong>Estado:</strong> ✅ Funcionando</p>
    <p><strong>Endpoints disponibles:</strong></p>
    <ul>
      <li><strong>GET /clientes</strong> - Ver todos los clientes</li>
      <li><strong>POST /clientes</strong> - Crear nuevo cliente</li>
      <li><strong>PUT /clientes/:id</strong> - Actualizar cliente</li>
      <li><strong>DELETE /clientes/:id</strong> - Eliminar cliente</li>
      <li><strong>GET /clientes/:id/vencimiento</strong> - Ver vencimiento</li>
      <li><strong>GET /dashboard</strong> - Dashboard interactivo</li>
    </ul>
    <p>🔔 Las notificaciones automáticas se ejecutan todos los días a las 9:00 AM</p>
    <p><a href="/dashboard" style="color: blue; text-decoration: underline;">Ir al Dashboard Interactivo</a></p>
  `);
});

// DASHBOARD INTERACTIVO
app.get('/dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Sistema de Cobranza</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; text-align: center; }
        .header h1 { color: #333; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; }
        .form-section, .list-section { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
        input, select { width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px; font-size: 14px; }
        input:focus, select:focus { border-color: #667eea; outline: none; }
        button { background: #667eea; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; width: 100%; margin-top: 10px; }
        button:hover { background: #5a6fd8; }
        .btn-danger { background: #e74c3c; }
        .btn-danger:hover { background: #c0392b; }
        .clientes-list { max-height: 600px; overflow-y: auto; }
        .cliente-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .cliente-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .cliente-nombre { font-weight: bold; color: #333; }
        .cliente-deuda { background: #ff6b6b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .cliente-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
        .info-item { margin-bottom: 5px; }
        .info-label { font-weight: 600; color: #666; }
        .actions { display: flex; gap: 10px; margin-top: 10px; }
        .btn-small { padding: 6px 12px; font-size: 12px; width: auto; }
        .status-connected { color: #27ae60; font-weight: bold; }
        .status-disconnected { color: #e74c3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Dashboard - Sistema de Cobranza</h1>
            <p>Gestión completa de clientes</p>
            <div id="status" class="status-connected">✅ Conectado a la base de datos</div>
        </div>
        <div class="grid">
            <div class="form-section">
                <h3 id="form-title">➕ Agregar Nuevo Cliente</h3>
                <form id="cliente-form">
                    <input type="hidden" id="cliente-id">
                    <div class="form-group"><label for="nombre">Nombre:</label><input type="text" id="nombre" required></div>
                    <div class="form-group"><label for="apellido">Apellido:</label><input type="text" id="apellido" required></div>
                    <div class="form-group"><label for="celular">Celular:</label><input type="text" id="celular" required></div>
                    <div class="form-group"><label for="email">Email:</label><input type="email" id="email"></div>
                    <div class="form-group"><label for="direccion">Dirección:</label><input type="text" id="direccion" required></div>
                    <div class="form-group"><label for="ip">Dirección IP:</label><input type="text" id="ip" required placeholder="192.168.1.100"></div>
                    <div class="form-group"><label for="mac">Dirección MAC:</label><input type="text" id="mac" required placeholder="00:1B:44:11:3A:B7"></div>
                    <div class="form-group"><label for="fecha_contrato">Fecha de Contrato:</label><input type="date" id="fecha_contrato" required></div>
                    <div class="form-group"><label for="deuda_actual">Deuda Actual (S/.):</label><input type="number" id="deuda_actual" value="40" required></div>
                    <button type="submit" id="submit-btn">Guardar Cliente</button>
                    <button type="button" id="cancel-btn" style="display: none;" class="btn-danger">Cancelar Edición</button>
                </form>
            </div>
            <div class="list-section">
                <h3>👥 Lista de Clientes</h3>
                <div class="clientes-list" id="clientes-list">
                    <div style="text-align: center; padding: 20px; color: #666;">Cargando clientes...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let clientes = [];
        let editando = false;

        document.addEventListener('DOMContentLoaded', function() {
            cargarClientes();
            configurarFechaActual();
        });

        function configurarFechaActual() {
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('fecha_contrato').value = hoy;
        }

        async function cargarClientes() {
            try {
                const response = await fetch('/clientes');
                const data = await response.json();
                if (data.success) {
                    clientes = data.clientes;
                    mostrarClientes();
                    document.getElementById('status').className = 'status-connected';
                    document.getElementById('status').textContent = '✅ Conectado - ' + data.count + ' clientes';
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                console.error('Error cargando clientes:', error);
                document.getElementById('status').className = 'status-disconnected';
                document.getElementById('status').textContent = '❌ Error: ' + error.message;
            }
        }

        function mostrarClientes() {
            const lista = document.getElementById('clientes-list');
            if (clientes.length === 0) {
                lista.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No hay clientes registrados</div>';
                return;
            }
            lista.innerHTML = clientes.map(cliente => 
                '<div class="cliente-card">' +
                    '<div class="cliente-header">' +
                        '<span class="cliente-nombre">' + cliente.nombre + ' ' + cliente.apellido + '</span>' +
                        '<span class="cliente-deuda">S/.' + cliente.deuda_actual + '</span>' +
                    '</div>' +
                    '<div class="cliente-info">' +
                        '<div class="info-item"><span class="info-label">📱 Celular:</span> ' + cliente.celular + '</div>' +
                        '<div class="info-item"><span class="info-label">🏠 Dirección:</span> ' + cliente.direccion + '</div>' +
                        '<div class="info-item"><span class="info-label">🌐 IP:</span> ' + cliente.ip + '</div>' +
                        '<div class="info-item"><span class="info-label">🔗 MAC:</span> ' + cliente.mac + '</div>' +
                        '<div class="info-item"><span class="info-label">📧 Email:</span> ' + (cliente.email || 'No especificado') + '</div>' +
                        '<div class="info-item"><span class="info-label">📅 Contrato:</span> ' + new Date(cliente.fecha_contrato).toLocaleDateString() + '</div>' +
                    '</div>' +
                    '<div class="actions">' +
                        '<button class="btn-small" onclick="editarCliente(\\'' + cliente._id + '\\')">✏️ Editar</button>' +
                        '<button class="btn-small btn-danger" onclick="eliminarCliente(\\'' + cliente._id + '\\')">🗑️ Eliminar</button>' +
                        '<button class="btn-small" onclick="verVencimiento(\\'' + cliente._id + '\\')">📅 Vencimiento</button>' +
                    '</div>' +
                '</div>'
            ).join('');
        }

        document.getElementById('cliente-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                nombre: document.getElementById('nombre').value,
                apellido: document.getElementById('apellido').value,
                celular: document.getElementById('celular').value,
                email: document.getElementById('email').value,
                direccion: document.getElementById('direccion').value,
                ip: document.getElementById('ip').value,
                mac: document.getElementById('mac').value,
                fecha_contrato: document.getElementById('fecha_contrato').value,
                deuda_actual: parseFloat(document.getElementById('deuda_actual').value)
            };
            try {
                let response;
                if (editando) {
                    const clienteId = document.getElementById('cliente-id').value;
                    response = await fetch('/clientes/' + clienteId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                } else {
                    response = await fetch('/clientes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                }
                const data = await response.json();
                if (data.success) {
                    alert(editando ? '✅ Cliente actualizado' : '✅ Cliente creado');
                    resetForm();
                    cargarClientes();
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        });

        function editarCliente(id) {
            const cliente = clientes.find(c => c._id === id);
            if (!cliente) return;
            document.getElementById('cliente-id').value = cliente._id;
            document.getElementById('nombre').value = cliente.nombre;
            document.getElementById('apellido').value = cliente.apellido;
            document.getElementById('celular').value = cliente.celular;
            document.getElementById('email').value = cliente.email || '';
            document.getElementById('direccion').value = cliente.direccion;
            document.getElementById('ip').value = cliente.ip;
            document.getElementById('mac').value = cliente.mac;
            document.getElementById('fecha_contrato').value = cliente.fecha_contrato.split('T')[0];
            document.getElementById('deuda_actual').value = cliente.deuda_actual;
            document.getElementById('form-title').textContent = '✏️ Editar Cliente';
            document.getElementById('submit-btn').textContent = 'Actualizar Cliente';
            document.getElementById('cancel-btn').style.display = 'block';
            editando = true;
        }

        async function eliminarCliente(id) {
            if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
            try {
                const response = await fetch('/clientes/' + id, { method: 'DELETE' });
                const data = await response.json();
                if (data.success) {
                    alert('✅ Cliente eliminado');
                    cargarClientes();
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }

        async function verVencimiento(id) {
            try {
                const response = await fetch('/clientes/' + id + '/vencimiento');
                const data = await response.json();
                if (data.success) {
                    alert('📅 Vencimiento de ' + data.cliente + '\\nDías faltantes: ' + data.diasFaltantes + '\\nDía de pago: ' + data.diaPago + '\\nMensaje: ' + data.mensaje);
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }

        document.getElementById('cancel-btn').addEventListener('click', function() {
            resetForm();
        });

        function resetForm() {
            document.getElementById('cliente-form').reset();
            document.getElementById('cliente-id').value = '';
            document.getElementById('form-title').textContent = '➕ Agregar Nuevo Cliente';
            document.getElementById('submit-btn').textContent = 'Guardar Cliente';
            document.getElementById('cancel-btn').style.display = 'none';
            configurarFechaActual();
            editando = false;
        }

        setInterval(cargarClientes, 30000);
    </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎯 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Sistema de Cobranza inicializado`);
  console.log(`🔔 Notificaciones programadas: ACTIVAS`);
  
  setTimeout(() => {
    verificarEstadoDB();
  }, 2000);
});
