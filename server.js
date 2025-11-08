// RUTA DEL DASHBOARD INTERACTIVO
app.get('/dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Sistema de Cobranza</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            text-align: center;
        }
        
        .header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 20px;
        }
        
        .form-section, .list-section {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
        }
        
        input, select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        
        input:focus, select:focus {
            border-color: #667eea;
            outline: none;
        }
        
        button {
            background: #667eea;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 10px;
        }
        
        button:hover {
            background: #5a6fd8;
        }
        
        .btn-danger {
            background: #e74c3c;
        }
        
        .btn-danger:hover {
            background: #c0392b;
        }
        
        .clientes-list {
            max-height: 600px;
            overflow-y: auto;
        }
        
        .cliente-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
        }
        
        .cliente-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .cliente-nombre {
            font-weight: bold;
            color: #333;
        }
        
        .cliente-deuda {
            background: #ff6b6b;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .cliente-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 14px;
        }
        
        .info-item {
            margin-bottom: 5px;
        }
        
        .info-label {
            font-weight: 600;
            color: #666;
        }
        
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
            width: auto;
        }
        
        .status-connected {
            color: #27ae60;
            font-weight: bold;
        }
        
        .status-disconnected {
            color: #e74c3c;
            font-weight: bold;
        }
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
            <!-- Formulario para agregar/editar clientes -->
            <div class="form-section">
                <h3 id="form-title">➕ Agregar Nuevo Cliente</h3>
                <form id="cliente-form">
                    <input type="hidden" id="cliente-id">
                    
                    <div class="form-group">
                        <label for="nombre">Nombre:</label>
                        <input type="text" id="nombre" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="apellido">Apellido:</label>
                        <input type="text" id="apellido" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="celular">Celular:</label>
                        <input type="text" id="celular" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email">
                    </div>
                    
                    <div class="form-group">
                        <label for="direccion">Dirección:</label>
                        <input type="text" id="direccion" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="ip">Dirección IP:</label>
                        <input type="text" id="ip" required placeholder="192.168.1.100">
                    </div>
                    
                    <div class="form-group">
                        <label for="mac">Dirección MAC:</label>
                        <input type="text" id="mac" required placeholder="00:1B:44:11:3A:B7">
                    </div>
                    
                    <div class="form-group">
                        <label for="fecha_contrato">Fecha de Contrato:</label>
                        <input type="date" id="fecha_contrato" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="deuda_actual">Deuda Actual (S/.):</label>
                        <input type="number" id="deuda_actual" value="40" required>
                    </div>
                    
                    <button type="submit" id="submit-btn">Guardar Cliente</button>
                    <button type="button" id="cancel-btn" style="display: none;" class="btn-danger">Cancelar Edición</button>
                </form>
            </div>
            
            <!-- Lista de clientes -->
            <div class="list-section">
                <h3>👥 Lista de Clientes</h3>
                <div class="clientes-list" id="clientes-list">
                    <div style="text-align: center; padding: 20px; color: #666;">
                        Cargando clientes...
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Variables globales
        let clientes = [];
        let editando = false;

        // Cargar clientes al iniciar
        document.addEventListener('DOMContentLoaded', function() {
            cargarClientes();
            configurarFechaActual();
        });

        // Configurar fecha actual por defecto
        function configurarFechaActual() {
            const hoy = new Date().toISOString().split('T')[0];
            document.getElementById('fecha_contrato').value = hoy;
        }

        // Cargar lista de clientes
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

        // Mostrar clientes en la lista
        function mostrarClientes() {
            const lista = document.getElementById('clientes-list');
            
            if (clientes.length === 0) {
                lista.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No hay clientes registrados</div>';
                return;
            }

            lista.innerHTML = clientes.map(cliente => `
                <div class="cliente-card">
                    <div class="cliente-header">
                        <span class="cliente-nombre">${cliente.nombre} ${cliente.apellido}</span>
                        <span class="cliente-deuda">S/.${cliente.deuda_actual}</span>
                    </div>
                    <div class="cliente-info">
                        <div class="info-item">
                            <span class="info-label">📱 Celular:</span> ${cliente.celular}
                        </div>
                        <div class="info-item">
                            <span class="info-label">🏠 Dirección:</span> ${cliente.direccion}
                        </div>
                        <div class="info-item">
                            <span class="info-label">🌐 IP:</span> ${cliente.ip}
                        </div>
                        <div class="info-item">
                            <span class="info-label">🔗 MAC:</span> ${cliente.mac}
                        </div>
                        <div class="info-item">
                            <span class="info-label">📧 Email:</span> ${cliente.email || 'No especificado'}
                        </div>
                        <div class="info-item">
                            <span class="info-label">📅 Contrato:</span> ${new Date(cliente.fecha_contrato).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="actions">
                        <button class="btn-small" onclick="editarCliente('${cliente._id}')">✏️ Editar</button>
                        <button class="btn-small btn-danger" onclick="eliminarCliente('${cliente._id}')">🗑️ Eliminar</button>
                        <button class="btn-small" onclick="verVencimiento('${cliente._id}')">📅 Vencimiento</button>
                    </div>
                </div>
            `).join('');
        }

        // Manejar envío del formulario
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
                    // Actualizar cliente existente
                    const clienteId = document.getElementById('cliente-id').value;
                    response = await fetch(\`/clientes/\${clienteId}\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                } else {
                    // Crear nuevo cliente
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

        // Editar cliente
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

        // Eliminar cliente
        async function eliminarCliente(id) {
            if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;

            try {
                const response = await fetch(\`/clientes/\${id}\`, { method: 'DELETE' });
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

        // Ver vencimiento
        async function verVencimiento(id) {
            try {
                const response = await fetch(\`/clientes/\${id}/vencimiento\`);
                const data = await response.json();
                
                if (data.success) {
                    alert(\`📅 Vencimiento de \${data.cliente}\\nDías faltantes: \${data.diasFaltantes}\\nDía de pago: \${data.diaPago}\\nMensaje: \${data.mensaje}\`);
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }

        // Cancelar edición
        document.getElementById('cancel-btn').addEventListener('click', function() {
            resetForm();
        });

        // Resetear formulario
        function resetForm() {
            document.getElementById('cliente-form').reset();
            document.getElementById('cliente-id').value = '';
            document.getElementById('form-title').textContent = '➕ Agregar Nuevo Cliente';
            document.getElementById('submit-btn').textContent = 'Guardar Cliente';
            document.getElementById('cancel-btn').style.display = 'none';
            configurarFechaActual();
            editando = false;
        }

        // Recargar cada 30 segundos
        setInterval(cargarClientes, 30000);
    </script>
</body>
</html>
  `);
});
