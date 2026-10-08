import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function generateArchitecturePdf() {
  console.log('🚀 Iniciando generación del Dossier de Arquitectura Técnica en PDF...');

  const logoPath = path.join(process.cwd(), 'public', 'logo_sigpad_transparent.png');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>SIGPAD OS — Documento Maestro de Arquitectura y Escalabilidad Técnica</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 14mm 16mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9.5pt;
      line-height: 1.5;
    }
    .cover-page {
      page-break-after: always;
      height: 98vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px;
      background: linear-gradient(135deg, #070b14 0%, #0d1527 60%, #0a1120 100%);
      color: #ffffff;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
      overflow: hidden;
    }
    .cover-glow {
      position: absolute;
      top: 15%;
      right: -10%;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(37,99,235,0.1) 60%, transparent 80%);
      border-radius: 50%;
      filter: blur(50px);
      pointer-events-none;
    }
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.15);
      padding-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(6,182,212,0.15);
      border: 1px solid rgba(6,182,212,0.4);
      color: #22d3ee;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .cover-title-block {
      margin-top: 40px;
      margin-bottom: 40px;
    }
    .cover-title {
      font-size: 28pt;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin: 16px 0;
      background: linear-gradient(135deg, #ffffff 40%, #a5f3fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cover-subtitle {
      font-size: 13pt;
      color: #94a3b8;
      max-width: 650px;
      line-height: 1.4;
      font-weight: 400;
    }
    .cover-footer {
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 24px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .meta-item h4 {
      margin: 0;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .meta-item p {
      margin: 4px 0 0 0;
      font-size: 10pt;
      font-weight: 700;
      color: #f1f5f9;
    }
    .page {
      padding: 10px 0;
    }
    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
    }
    h2 {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #06b6d4;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    p {
      margin: 0 0 10px 0;
      color: #334155;
      text-align: justify;
    }
    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 20px;
      color: #334155;
    }
    li {
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 8.5pt;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      border: 1px solid #1e293b;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .callout {
      background: #f0fdfa;
      border-left: 4px solid #06b6d4;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 14px 0;
    }
    .callout-title {
      font-weight: 800;
      color: #0e7490;
      margin-bottom: 4px;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .callout-body {
      color: #155e75;
      font-size: 8.5pt;
      margin: 0;
    }
    .diagram-card {
      background: #090e17;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
      color: #ffffff;
    }
    .diagram-title {
      font-size: 9pt;
      font-weight: 800;
      color: #22d3ee;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .arch-flow {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .arch-box {
      background: #111827;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 12px;
    }
    .arch-box-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #38bdf8;
      border-bottom: 1px solid #1f2937;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .arch-box-item {
      font-size: 7.5pt;
      color: #9ca3af;
      margin: 3px 0;
    }
    .footer-bar {
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #64748b;
      font-family: monospace;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 14px 0;
    }
    .kpi-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .kpi-value {
      font-size: 15pt;
      font-weight: 900;
      color: #0284c7;
      line-height: 1.1;
    }
    .kpi-label {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-top: 4px;
    }
  </style>
</head>
<body>

  <!-- ─── COVER PAGE ─── -->
  <div class="cover-page">
    <div class="cover-glow"></div>
    <div class="cover-header">
      <img src="${logoBase64}" alt="SIGPAD" style="height: 50px; width: auto; object-fit: contain;">
      <span class="badge">Dossier de Ingeniería · Confidencial</span>
    </div>

    <div class="cover-title-block">
      <div style="font-size: 10pt; font-weight: 800; color: #22d3ee; letter-spacing: 0.15em; text-transform: uppercase;">
        Documento Técnico de Especificación
      </div>
      <h1 class="cover-title">Arquitectura y Escalabilidad Técnica</h1>
      <p class="cover-subtitle">
        Diseño del sistema integral para seguridad privada de alta concurrencia, monitoreo satelital en tiempo real, geocercas activas y libro de guardia digital.
      </p>
    </div>

    <div class="cover-footer">
      <div class="meta-item">
        <h4>Versión del Sistema</h4>
        <p>SIGPAD OS v2.4 Enterprise</p>
      </div>
      <div class="meta-item">
        <h4>Arquitectura Base</h4>
        <p>Next.js 16 + Supabase Postgres</p>
      </div>
      <div class="meta-item">
        <h4>Fecha de Auditoría</h4>
        <p>Octubre 2026</p>
      </div>
    </div>
  </div>

  <!-- ─── PAGE 1: RESUMEN EJECUTIVO Y KPIS ─── -->
  <div class="page">
    <h2>1. Resumen Ejecutivo y Visión del Sistema</h2>
    <p>
      <strong>SIGPAD (Sistema Inteligente de Gestión y Protección para Seguridad Privada)</strong> es una plataforma de misión crítica construida para resolver la supervisión operativa de agentes de seguridad en objetivos físicos dispersos. Su arquitectura combina cómputo sin servidor distribuido (Serverless Edge) y un motor de base de datos relacional con replicación lógica en tiempo real para garantizar auditoría jurídica inmutable y cero latencia de alertas.
    </p>

    <div class="kpi-grid avoid-break">
      <div class="kpi-box">
        <div class="kpi-value">&lt; 1.5s</div>
        <div class="kpi-label">Latencia de Alertas (Pánico/SOS)</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-value">&lt; 50ms</div>
        <div class="kpi-label">Arranque SWR (Cold-to-Render)</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-value">100%</div>
        <div class="kpi-label">Aislamiento Multi-Tenant (RLS)</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-value">99.9%</div>
        <div class="kpi-label">Disponibilidad en Borde (Edge SLA)</div>
      </div>
    </div>

    <h3>Requerimientos No Funcionales Fundamentales</h3>
    <ul>
      <li><strong>Cero Datos Cruzados (Tenant Isolation):</strong> Garantía estricta de particionamiento de datos entre diferentes empresas de seguridad usuarias del sistema.</li>
      <li><strong>Resiliencia a Conectividad Intermitente:</strong> Funcionamiento en puestos perimetrales donde la señal celular oscila, mediante cola de reintentos e hidratación de caché local.</li>
      <li><strong>Monitoreo de Batería y GPS Pasivo:</strong> Telemetría continua de nivel de batería y precisión satelital de cada agente de vigilancia en servicio.</li>
    </ul>

    <h2>2. Arquitectura Global en Tres Capas</h2>
    <p>
      El sistema adopta un modelo de <em>Monolito Modular Moderno</em> distribuido en tres niveles de procesamiento desacoplados:
    </p>

    <div class="diagram-card avoid-break">
      <div class="diagram-title">⚡ Diagrama de Topología del Sistema</div>
      <div class="arch-flow">
        <div class="arch-box">
          <div class="arch-box-title">CAPA 1: CLIENTE (EDGE)</div>
          <div class="arch-box-item">• PWA Mobile (Android / iOS / Chrome)</div>
          <div class="arch-box-item">• Dashboard Gerencial Táctico (PC)</div>
          <div class="arch-box-item">• Service Worker V12 (Network-First)</div>
          <div class="arch-box-item">• Caché SWR LocalStorage (&lt;50ms)</div>
          <div class="arch-box-item">• Framer Motion GPU Physics</div>
        </div>
        <div class="arch-box">
          <div class="arch-box-title">CAPA 2: CÓMPUTO (SERVERLESS)</div>
          <div class="arch-box-item">• Next.js 16.2 App Router</div>
          <div class="arch-box-item">• Vercel Edge CDN en San Pablo / BsAs</div>
          <div class="arch-box-item">• Route Handlers Autoescalables</div>
          <div class="arch-box-item">• Cabeceras Cache-Control Privadas</div>
          <div class="arch-box-item">• Tenant Resolver Token/Cookie</div>
        </div>
        <div class="arch-box">
          <div class="arch-box-title">CAPA 3: DATOS & REALTIME</div>
          <div class="arch-box-item">• PostgreSQL 15+ Core Engine</div>
          <div class="arch-box-item">• Supavisor (Connection Pooler)</div>
          <div class="arch-box-item">• WebSockets WSS (WAL Streaming)</div>
          <div class="arch-box-item">• Row-Level Security (RLS)</div>
          <div class="arch-box-item">• S3 Storage (Fotos y Evidencias)</div>
        </div>
      </div>
    </div>

    <div class="callout avoid-break">
      <div class="callout-title">💡 Ventaja Clave del Modelo Serverless Edge</div>
      <p class="callout-body">
        Al no requerir servidores físicos dedicados que gestionar manualmente, el backend escala automáticamente de 1 a 10.000 solicitudes concurrentes sin riesgo de caídas por agotamiento de threads, y sin costos ociosos durante horas de baja actividad.
      </p>
    </div>

    <div class="footer-bar">
      <span>SIGPAD OS · ARQUITECTURA TÉCNICA v2.4</span>
      <span>PÁGINA 1 DE 3</span>
    </div>
  </div>

  <!-- ─── PAGE 2: MULTI-TENANCY Y FLUJOS TÁCTICOS ─── -->
  <div class="page page-break">
    <h2>3. Modelo Multi-Tenancy y Seguridad de Datos</h2>
    <p>
      Para certificar que una empresa de seguridad jamás acceda o filtre información hacia otra, la arquitectura implementa <strong>Tenant Partitioning</strong> en todas las capas del stack:
    </p>

    <table class="avoid-break">
      <thead>
        <tr>
          <th style="width: 25%;">Capa del Stack</th>
          <th style="width: 35%;">Mecanismo de Aislamiento</th>
          <th style="width: 40%;">Garantía de Seguridad</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Autenticación</strong></td>
          <td>Resolución de <code>tenant_id</code> en cookie encriptada y token de sesión</td>
          <td>Imposible solicitar datos de un tenant ajeno desde el cliente</td>
        </tr>
        <tr>
          <td><strong>Caché de Navegador</strong></td>
          <td>Claves SWR con namespace: <code>sigpad_cache_map_{tenant_id}</code></td>
          <td>Cero contaminación de datos al alternar entre dispositivos</td>
        </tr>
        <tr>
          <td><strong>Red de Entrega (CDN)</strong></td>
          <td>Cabecera <code>Cache-Control: private, max-age=5</code></td>
          <td>Los proxies y CDNs nunca guardan datos compartidos entre usuarios</td>
        </tr>
        <tr>
          <td><strong>API Handlers</strong></td>
          <td>Inyección forzada de <code>.eq('tenant_id', tenantId)</code> en toda query</td>
          <td>Cero leaks en endpoints REST aunque el cliente altere parámetros</td>
        </tr>
        <tr>
          <td><strong>Base de Datos</strong></td>
          <td>Foreign Key obligatoria hacia tabla <code>tenants(id)</code> en cada registro</td>
          <td>Integridad referencial estricta y borrado en cascada aislado</td>
        </tr>
      </tbody>
    </table>

    <h2>4. Máquinas de Estado de los Protocolos Operativos</h2>
    
    <h3>4.1. Protocolo de Abandono de Puesto (Geocercas Satelitales)</h3>
    <p>
      Cada objetivo físico tiene configurado su radio perimetral (en metros) o un polígono geográfico. El algoritmo evalúa la posición del guardia utilizando la fórmula esférica de <em>Haversine</em>:
    </p>
    <ul>
      <li><strong>Check-in:</strong> Solo permitido si <code>distancia &lt;= radio_objetivo</code>. Si el guardia está a más metros, el sistema rechaza el fichaje y notifica el desvío.</li>
      <li><strong>Filtro Anti-Falsos Positivos (Debounce de 60s):</strong> Las anomalías de señal GPS (saltos momentáneos a 0,0) son filtradas automáticamente antes de levantar una alarma.</li>
      <li><strong>Escalación Sonora al Radar:</strong> Si el guardia permanece fuera del perímetro más de 3 minutos, el servidor genera un incidente en <code>alarms</code> y hace sonar la sirena del panel central.</li>
    </ul>

    <h3>4.2. Protocolo de "Hombre Vivo" (Dead Man's Switch)</h3>
    <p>
      Mecanismo legal y de seguridad física para certificar que el guardia nocturno no ha sufrido una agresión, descompensación o dormido en el puesto:
    </p>
    <ul>
      <li><strong>Disparador Periódico:</strong> Cada 30 a 60 minutos, la app del operador activa una vibración intensa y tono agudo, mostrando una pantalla de confirmación táctil de un solo toque.</li>
      <li><strong>Período de Gracia:</strong> El guardia dispone de una ventana de 3 minutos para responder.</li>
      <li><strong>Falla y Alerta Roja:</strong> Si el tiempo expira sin respuesta, el incidente se eleva a urgencia <em>Crítica</em> y el radar gerencial reproduce <code>emergency.mp3</code> en bucle ininterrumpido hasta su resolución manual por un supervisor.</li>
    </ul>

    <div class="callout avoid-break">
      <div class="callout-title">🔒 Purga Atómica en Deslogueo (Atomic Handover Purge)</div>
      <p class="callout-body">
        Al finalizar un turno o cerrar sesión desde un teléfono compartido en garita, el sistema invoca una rutina de limpieza integral (<code>localStorage.clear()</code> y revocación de tokens) para asegurar que el siguiente relevo no encuentre datos residuales del compañero anterior.
      </p>
    </div>

    <div class="footer-bar">
      <span>SIGPAD OS · ARQUITECTURA TÉCNICA v2.4</span>
      <span>PÁGINA 2 DE 3</span>
    </div>
  </div>

  <!-- ─── PAGE 3: MATRIZ DE ESCALABILIDAD Y PROTOCOLO DE CALIDAD ─── -->
  <div class="page page-break">
    <h2>5. Matriz de las 10 Estrategias de Escalamiento</h2>
    <p>
      Evaluación de viabilidad y estado técnico de las 10 metodologías de escalabilidad aplicadas a SIGPAD:
    </p>

    <table class="avoid-break">
      <thead>
        <tr>
          <th>Estrategia</th>
          <th>Estado en SIGPAD</th>
          <th>Detalle Técnico de Implementación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1. Escalado Vertical</strong></td>
          <td><span style="color: #0284c7; font-weight: 700;">Habilitado</span></td>
          <td>Escalado dinámico de CPU/RAM en Supabase PostgreSQL sin modificar código.</td>
        </tr>
        <tr>
          <td><strong>2. Escalado Horizontal</strong></td>
          <td><span style="color: #059669; font-weight: 700;">Activo (100%)</span></td>
          <td>Funciones Serverless en Vercel clonadas elásticamente en milisegundos.</td>
        </tr>
        <tr>
          <td><strong>3. Balanceo de Carga</strong></td>
          <td><span style="color: #059669; font-weight: 700;">Activo (100%)</span></td>
          <td>Reparto de tráfico de red a través de Anycast DNS y Edge Routers.</td>
        </tr>
        <tr>
          <td><strong>4. Autoescalado</strong></td>
          <td><span style="color: #059669; font-weight: 700;">Activo (100%)</span></td>
          <td>Ajuste de computación automático según densidad de guardias en servicio.</td>
        </tr>
        <tr>
          <td><strong>5. Caché Inteligente</strong></td>
          <td><span style="color: #059669; font-weight: 700;">Activo (SWR)</span></td>
          <td>Hidratación local &lt;50ms en cliente + Caché privada de borde sin cruces.</td>
        </tr>
        <tr>
          <td><strong>6. Red CDN</strong></td>
          <td><span style="color: #059669; font-weight: 700;">Activo (100%)</span></td>
          <td>Distribución de librerías, CSS y mapas en nodos de São Paulo y Buenos Aires.</td>
        </tr>
        <tr>
          <td><strong>7. Replicación BD</strong></td>
          <td><span style="color: #d97706; font-weight: 700;">Roadmap</span></td>
          <td>Réplicas de lectura exclusivas para reportes contables y liquidación de horas.</td>
        </tr>
        <tr>
          <td><strong>8. Fragmentación (Sharding)</strong></td>
          <td><span style="color: #64748b; font-weight: 700;">No Requerida</span></td>
          <td>PostgreSQL maneja holgadamente &gt;20.000 puestos con índices B-Tree/GIST.</td>
        </tr>
        <tr>
          <td><strong>9. Proceso Asíncrono</strong></td>
          <td><span style="color: #059669; font-weight: 700;">Activo (100%)</span></td>
          <td>La API confirma recepción al guardia en 50ms y procesa alertas en background.</td>
        </tr>
        <tr>
          <td><strong>10. Monolito Modular</strong></td>
          <td><span style="color: #059669; font-weight: 700;">Activo (100%)</span></td>
          <td>Arquitectura modular unificada con integridad transaccional ACID garantizada.</td>
        </tr>
      </tbody>
    </table>

    <h2>6. Solución al Reto de Celulares en Segundo Plano</h2>
    <p>
      En dispositivos móviles (Android / iOS), el sistema operativo suspende los navegadores web cuando la pantalla se apaga (<em>Doze Mode</em>). SIGPAD mitiga esta restricción mediante:
    </p>
    <ul>
      <li><strong>Web Push API (W3C):</strong> Alertas enviadas a través del protocolo Push de Google FCM que despiertan el teléfono y hacen sonar la sirena aún con la pantalla apagada.</li>
      <li><strong>Siguiente Salto Tecnológico (Roadmap):</strong> Empaquetar la app web con un contenedor nativo (<em>Capacitor / Tauri</em>) para activar un <strong>Foreground Service persistente</strong> con notificación fija en la barra de Android. Esto otorga captura de coordenadas satelitales las 24 horas cada 30 segundos sin suspensión por ahorro de batería.</li>
    </ul>

    <h2>7. Protocolo de Cero Regresión y Calidad Continua</h2>
    <p>
      Toda actualización del código fuente debe superar estrictamente tres compuertas automatizadas antes de pasar a producción:
    </p>
    <ol>
      <li><strong>Compilación Estricta de Tipos:</strong> <code>npx tsc --noEmit</code> con 0 errores permitidos.</li>
      <li><strong>Suite de Integridad Automatizada:</strong> <code>npx tsx scripts/verify-platform-integrity.ts</code> validando anclas de mapas, limpieza de WebSockets y filtros de guardias.</li>
      <li><strong>Despliegue y Verificación en Vivo:</strong> Auditoría de respuesta inmediata en <code>https://www.sigpad.com.ar</code>.</li>
    </ol>

    <div class="footer-bar">
      <span>SIGPAD OS · ARQUITECTURA TÉCNICA v2.4</span>
      <span>PÁGINA 3 DE 3 · FIN DEL DOCUMENTO</span>
    </div>
  </div>

</body>
</html>`;

  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const htmlPath = path.join(scratchDir, 'architecture_dossier.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log('✅ Archivo HTML generado en:', htmlPath);

  const desktopPdfPath = 'C:\\Users\\Grupo 5\\Desktop\\SIGPAD_Documento_Maestro_Arquitectura.pdf';
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

  console.log('🖨️ Imprimiendo PDF con Microsoft Edge Headless Engine hacia:', desktopPdfPath);

  const edgeExe = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  let browserExe = fs.existsSync(edgeExe) ? edgeExe : chromeExe;

  const { spawnSync } = await import('child_process');
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${desktopPdfPath}`,
    fileUrl
  ];

  const result = spawnSync(browserExe, args, { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }

  if (fs.existsSync(desktopPdfPath)) {
    const stats = fs.statSync(desktopPdfPath);
    console.log(`🎉 ¡ÉXITO! PDF creado correctamente en el Escritorio:`);
    console.log(`📁 Ruta: ${desktopPdfPath}`);
    console.log(`📊 Tamaño: ${(stats.size / 1024).toFixed(1)} KB`);
  } else {
    throw new Error('No se encontró el archivo PDF generado en el escritorio.');
  }
}

generateArchitecturePdf().catch(err => {
  console.error('❌ Error generando PDF:', err);
  process.exit(1);
});
