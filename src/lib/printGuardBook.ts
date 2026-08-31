export interface PrintGuardBookOptions {
  title?: string;
  companyName?: string;
  objectiveName?: string;
  startDate?: string;
  endDate?: string;
}

export function printGuardBookSheet(entries: any[], options: PrintGuardBookOptions = {}) {
  const companyName = options.companyName || 'SIGPAD PLATAFORMA DE SEGURIDAD';
  const title = options.title || 'HOJA OFICIAL DE LIBRO DE GUARDIA';
  const objectiveName = options.objectiveName || 'TODOS LOS OBJETIVOS OPERATIVOS';
  const startDate = options.startDate || 'HISTÓRICO';
  const endDate = options.endDate || new Date().toLocaleDateString('es-AR');
  const now = new Date().toLocaleString('es-AR');

  const rowsHtml = entries.map((entry, index) => {
    const dateStr = new Date(entry.created_at).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const typeLabel = (entry.entry_type || 'Novedad').toUpperCase().replace('_', ' ');
    const urgency = (entry.urgency || 'NORMAL').toUpperCase();
    const operator = entry.resources?.name || entry.resource_id || 'OPERADOR';
    const objName = entry.objectives?.name || objectiveName;
    const content = entry.content || 'Sin descripción';

    const urgencyColor = (urgency === 'CRITICA' || urgency === 'EMERGENCIA') 
      ? '#dc2626' 
      : (urgency === 'ALTA') 
      ? '#ea580c' 
      : '#27272a';

    return `
      <tr style="border-bottom: 1px solid #e4e4e7; font-size: 11px;">
        <td style="padding: 8px; font-weight: bold; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; white-space: nowrap; font-family: monospace; font-weight: bold;">${dateStr}</td>
        <td style="padding: 8px; font-weight: bold; text-transform: uppercase;">${objName}</td>
        <td style="padding: 8px; font-weight: bold; text-transform: uppercase;">${operator}</td>
        <td style="padding: 8px; text-align: center;"><span style="background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">${typeLabel}</span></td>
        <td style="padding: 8px; text-align: center; color: ${urgencyColor}; font-weight: 800; font-size: 9px;">${urgency}</td>
        <td style="padding: 8px; font-weight: 500; font-style: italic;">"${content}"</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${now}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b; margin: 0; padding: 0; background: #ffffff; }
          .header { border-bottom: 3px solid #0F4C5C; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .company { font-size: 10px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #0F4C5C; }
          .title { font-size: 20px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase; margin: 4px 0 0 0; color: #09090b; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f4f4f5; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 11px; }
          .meta-item strong { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #0F4C5C; color: #ffffff; text-align: left; padding: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
          .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid; }
          .signature-box { border-top: 1.5px solid #a1a1aa; text-align: center; padding-top: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #3f3f46; }
          .legal { margin-top: 30px; font-size: 9px; color: #a1a1aa; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">${companyName}</div>
            <h1 class="title">${title}</h1>
          </div>
          <div style="text-align: right; font-size: 10px; font-weight: bold; color: #71717a;">
            EMISIÓN: ${now} HS
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <strong>Puesto / Objetivo</strong>
            <span>${objectiveName}</span>
          </div>
          <div class="meta-item">
            <strong>Rango Auditado</strong>
            <span>${startDate} al ${endDate}</span>
          </div>
          <div class="meta-item">
            <strong>Total Novedades</strong>
            <span>${entries.length} registros oficiales</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">N°</th>
              <th style="width: 110px;">FECHA Y HORA</th>
              <th style="width: 140px;">OBJETIVO</th>
              <th style="width: 130px;">OPERADOR</th>
              <th style="width: 80px; text-align: center;">TIPO</th>
              <th style="width: 70px; text-align: center;">SEVERIDAD</th>
              <th>DETALLE DE LA NOVEDAD</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #a1a1aa;">No se encontraron registros de guardia para el período seleccionado.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div class="signature-box">
            Firma y Aclaración<br/>
            <span style="font-weight: 400; font-size: 9px; color: #71717a;">Director de Operaciones / Gerencia</span>
          </div>
          <div class="signature-box">
            Firma y Aclaración<br/>
            <span style="font-weight: 400; font-size: 9px; color: #71717a;">Responsable de Objetivo / Puesto</span>
          </div>
        </div>

        <div class="legal">
          Documento Oficial Impreso · Auditoría Digital Registrada en Sistema de Seguridad Táctica
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=950,height=750');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
