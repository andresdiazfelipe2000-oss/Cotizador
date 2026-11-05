/**
 * COTIZADOR TERCIO CREATIVO S.A.S. – Base de datos en Google Sheets
 * ---------------------------------------------------------------
 * Este programa convierte esta hoja de cálculo en la base de datos del cotizador.
 * Se pega en Extensiones > Apps Script y se publica como "Aplicación web".
 * Guarda usuarios, clientes, cotizaciones y ajustes en pestañas de esta hoja.
 * No hay que modificar nada aquí.
 */

const HOJAS = {
  Usuarios: ['id', 'nombre', 'email', 'rol', 'activo', 'telefono', 'creado', 'salt', 'hash'],
  Sesiones: ['token', 'userId', 'expira'],
  Clientes: ['id', 'nombre', 'tipoDoc', 'numDoc', 'correo', 'telefono', 'ciudad', 'tipoFactura', 'creadoPor', 'actualizado', 'json', 'json2', 'json3'],
  Cotizaciones: ['id', 'numero', 'fecha', 'cliente', 'documento', 'estado', 'subtotal', 'iva', 'total', 'costo', 'utilidad', 'creadaPor', 'ownerId', 'actualizado', 'json', 'json2', 'json3'],
  Config: ['clave', 'valor', 'valor2', 'valor3', 'actualizado']
};
const DIAS_SESION = 30;
const TROZO = 45000; // una celda de Google Sheets admite 50.000 caracteres

/* ---------------- Entrada de la aplicación web ---------------- */
function doGet() {
  return salida({ ok: true, app: 'Cotizador Tercio Creativo', mensaje: 'La base de datos está funcionando.' });
}

function doPost(e) {
  let q;
  try { q = JSON.parse(e.postData.contents); }
  catch (x) { return salida({ ok: false, error: 'Solicitud no válida.' }); }
  try { return salida(Object.assign({ ok: true }, rutas(q))); }
  catch (x) { return salida({ ok: false, error: x.message || String(x) }); }
}

function salida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Menú en la hoja para crear las pestañas a mano (opcional) */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Cotizador').addItem('Preparar pestañas', 'prepararHojas').addToUi();
}
function prepararHojas() { asegurarHojas(); }

/* ---------------- Rutas ---------------- */
function rutas(q) {
  asegurarHojas();
  switch (q.action) {
    case 'estado': {
      const a = leerCfg('ajustes');
      return { configurado: leer('Usuarios').length > 0, empresa: a && a.empresa ? a.empresa.nombre : '' };
    }
    case 'setup': return conCandado(() => {
      if (leer('Usuarios').length) throw new Error('El sistema ya está configurado. Ingresa con tu usuario.');
      const ad = q.admin || {};
      const u = nuevoUsuario(ad.nombre, ad.email, ad.pass, 'admin', ad.telefono || '');
      if (q.ajustes) guardarCfg('ajustes', q.ajustes);
      return { token: nuevaSesion(u.id), perfil: perfil(u) };
    });
    case 'login': {
      const email = String(q.email || '').trim().toLowerCase();
      const u = leer('Usuarios').find(x => String(x.email).toLowerCase() === email);
      if (!u || hashClave(String(q.pass || ''), u.salt) !== u.hash) throw new Error('Correo o contraseña incorrectos.');
      if (!esSi(u.activo)) throw new Error('Tu cuenta no está activa. Habla con el administrador.');
      limpiarSesiones();
      return { token: nuevaSesion(u.id), perfil: perfil(u) };
    }
    case 'logout': {
      if (q.token) conCandado(() => borrarFila('Sesiones', q.token));
      return {};
    }
  }

  const u = sesion(q.token);
  const admin = u.rol === 'admin';
  switch (q.action) {
    case 'cargar':
      return {
        perfil: perfil(u),
        ajustes: leerCfg('ajustes'),
        contador: Number(leerCfg('contador') || 0),
        clientes: leerJson('Clientes'),
        cotizaciones: leerJson('Cotizaciones'),
        usuarios: admin ? leer('Usuarios').map(perfil) : []
      };

    case 'reservarNumero': return conCandado(() => {
      const n = Number(leerCfg('contador') || 0) + 1;
      guardarCfg('contador', n);
      return { numero: 'COT-' + String(n).padStart(4, '0') };
    });

    case 'guardarCliente': return conCandado(() => {
      const c = q.dato || {};
      if (!c.id) throw new Error('Falta el identificador del cliente.');
      const prev = buscarJson('Clientes', c.id);
      c.ownerUid = prev && prev.ownerUid ? prev.ownerUid : u.id;
      c.ownerNombre = prev && prev.ownerNombre ? prev.ownerNombre : u.nombre;
      upsert('Clientes', c.id, Object.assign({
        nombre: txt(c.nombre), tipoDoc: c.tipoDoc || '', numDoc: txt(c.numDoc), correo: txt(c.correo), telefono: txt(c.telefono),
        ciudad: txt(c.ciudad), tipoFactura: c.tipoFactura === 'electronica' ? 'Electrónica' : 'POS',
        creadoPor: txt(c.ownerNombre), actualizado: new Date()
      }, trozos(c)));
      return { dato: c };
    });

    case 'borrarCliente':
      if (!admin) throw new Error('Solo un administrador puede eliminar clientes.');
      conCandado(() => borrarFila('Clientes', q.id));
      return {};

    case 'guardarCotizacion': return conCandado(() => {
      const c = q.dato || {};
      if (!c.id) throw new Error('Falta el identificador de la cotización.');
      const prev = buscarJson('Cotizaciones', c.id);
      c.ownerUid = prev && prev.ownerUid ? prev.ownerUid : u.id;
      c.ownerNombre = prev && prev.ownerNombre ? prev.ownerNombre : u.nombre;
      const cli = c.cliente || {};
      upsert('Cotizaciones', c.id, Object.assign({
        numero: c.numero || '', fecha: c.fecha ? new Date(c.fecha) : new Date(), cliente: txt(cli.nombre),
        documento: txt([cli.tipoDoc, cli.numDoc].filter(String).join(' ')), estado: c.estado || 'borrador',
        subtotal: Math.round(c.subtotal || 0), iva: Math.round(c.iva || 0), total: Math.round(c.total || 0),
        costo: Math.round(c.costo || 0), utilidad: Math.round(c.util || 0),
        creadaPor: txt(c.ownerNombre), ownerId: c.ownerUid, actualizado: new Date()
      }, trozos(c)));
      return { dato: c };
    });

    case 'borrarCotizacion': return conCandado(() => {
      const prev = buscarJson('Cotizaciones', q.id);
      if (!admin && (!prev || prev.estado !== 'borrador')) throw new Error('Solo un administrador puede eliminar cotizaciones que ya no están en borrador.');
      borrarFila('Cotizaciones', q.id);
      return {};
    });

    case 'guardarAjustes':
      if (!admin) throw new Error('Solo un administrador puede cambiar los ajustes.');
      conCandado(() => guardarCfg('ajustes', q.dato));
      return {};

    case 'crearUsuario':
      if (!admin) throw new Error('Solo un administrador puede crear usuarios.');
      return conCandado(() => {
        const n = nuevoUsuario(q.nombre, q.email, q.pass, q.rol === 'admin' ? 'admin' : 'empleado', q.telefono || '');
        return { usuario: perfil(n) };
      });

    case 'actualizarUsuario':
      if (!admin) throw new Error('Solo un administrador puede modificar usuarios.');
      return conCandado(() => {
        const hoja = hojaDe('Usuarios'); const datos = hoja.getDataRange().getValues(); const H = datos[0];
        const i = datos.findIndex((r, k) => k > 0 && r[0] === q.id);
        if (i < 0) throw new Error('Usuario no encontrado.');
        const fila = objeto(H, datos[i]);
        if (q.id === u.id && (q.rol !== undefined || q.activo !== undefined)) throw new Error('No puedes cambiar tu propio rol ni desactivarte.');
        if (q.rol !== undefined) fila.rol = q.rol === 'admin' ? 'admin' : 'empleado';
        if (q.activo !== undefined) fila.activo = !!q.activo;
        if (q.nuevaClave !== undefined) { validarClave(q.nuevaClave); fila.salt = Utilities.getUuid(); fila.hash = hashClave(q.nuevaClave, fila.salt); }
        hoja.getRange(i + 1, 1, 1, H.length).setValues([H.map(h => fila[h] === undefined ? '' : fila[h])]);
        return { usuario: perfil(fila) };
      });

    case 'cambiarClave':
      return conCandado(() => {
        if (hashClave(String(q.actual || ''), u.salt) !== u.hash) throw new Error('La contraseña actual no es correcta.');
        validarClave(q.nueva);
        const hoja = hojaDe('Usuarios'); const datos = hoja.getDataRange().getValues(); const H = datos[0];
        const i = datos.findIndex((r, k) => k > 0 && r[0] === u.id);
        const fila = objeto(H, datos[i]); fila.salt = Utilities.getUuid(); fila.hash = hashClave(q.nueva, fila.salt);
        hoja.getRange(i + 1, 1, 1, H.length).setValues([H.map(h => fila[h] === undefined ? '' : fila[h])]);
        return {};
      });
  }
  throw new Error('Acción desconocida: ' + q.action);
}

/* ---------------- Usuarios y sesiones ---------------- */
function nuevoUsuario(nombre, email, pass, rol, telefono) {
  nombre = String(nombre || '').trim(); email = String(email || '').trim().toLowerCase();
  if (!nombre) throw new Error('Falta el nombre.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('El correo no es válido.');
  validarClave(pass);
  if (leer('Usuarios').some(x => String(x.email).toLowerCase() === email)) throw new Error('Ya existe un usuario con ese correo.');
  const salt = Utilities.getUuid();
  const u = { id: 'u' + Utilities.getUuid().replace(/-/g, '').slice(0, 16), nombre: txt(nombre), email, rol, activo: true,
    telefono: txt(telefono), creado: new Date(), salt, hash: hashClave(pass, salt) };
  hojaDe('Usuarios').appendRow(HOJAS.Usuarios.map(h => u[h]));
  return u;
}
function validarClave(p) { if (String(p || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.'); }
function hashClave(clave, salt) {
  let h = salt + '|' + clave;
  for (let i = 0; i < 64; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}
function perfil(u) {
  return { id: u.id, nombre: String(u.nombre).replace(/^'/, ''), email: u.email, rol: u.rol, activo: esSi(u.activo), telefono: String(u.telefono || '').replace(/^'/, '') };
}
function nuevaSesion(userId) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  const exp = new Date(); exp.setDate(exp.getDate() + DIAS_SESION);
  hojaDe('Sesiones').appendRow([token, userId, exp]);
  return token;
}
function sesion(token) {
  if (!token) throw new Error('Sesión vencida. Ingresa de nuevo.');
  const s = leer('Sesiones').find(x => x.token === token);
  if (!s || new Date(s.expira) < new Date()) throw new Error('Sesión vencida. Ingresa de nuevo.');
  const u = leer('Usuarios').find(x => x.id === s.userId);
  if (!u || !esSi(u.activo)) throw new Error('Sesión vencida. Ingresa de nuevo.');
  u.nombre = String(u.nombre).replace(/^'/, '');
  return u;
}
function limpiarSesiones() {
  conCandado(() => {
    const hoja = hojaDe('Sesiones'); const datos = hoja.getDataRange().getValues(); const ahora = new Date();
    for (let i = datos.length - 1; i >= 1; i--) if (new Date(datos[i][2]) < ahora) hoja.deleteRow(i + 1);
  });
}

/* ---------------- Hoja de cálculo ---------------- */
function libro() { return SpreadsheetApp.getActiveSpreadsheet(); }
function hojaDe(nombre) { return libro().getSheetByName(nombre); }
function asegurarHojas() {
  const ss = libro();
  Object.keys(HOJAS).forEach(n => {
    let h = ss.getSheetByName(n);
    if (!h) {
      h = ss.insertSheet(n);
      h.getRange(1, 1, 1, HOJAS[n].length).setValues([HOJAS[n]]).setFontWeight('bold').setBackground('#F3ECE2');
      h.setFrozenRows(1);
    }
  });
}
function leer(nombre) {
  const datos = hojaDe(nombre).getDataRange().getValues();
  const H = datos[0];
  return datos.slice(1).filter(r => r[0] !== '' && r[0] !== null).map(r => objeto(H, r));
}
function objeto(H, r) { const o = {}; H.forEach((h, i) => { o[h] = r[i]; }); return o; }
function upsert(nombre, id, obj) {
  const hoja = hojaDe(nombre); const datos = hoja.getDataRange().getValues(); const H = datos[0];
  const fila = H.map(h => (h === 'id' ? id : (obj[h] === undefined ? '' : obj[h])));
  const i = datos.findIndex((r, k) => k > 0 && r[0] === id);
  if (i > 0) hoja.getRange(i + 1, 1, 1, H.length).setValues([fila]);
  else hoja.appendRow(fila);
}
function borrarFila(nombre, id) {
  const hoja = hojaDe(nombre); const datos = hoja.getDataRange().getValues();
  for (let i = datos.length - 1; i >= 1; i--) if (datos[i][0] === id) hoja.deleteRow(i + 1);
}
function trozos(o) {
  const s = JSON.stringify(o);
  if (s.length > TROZO * 3) throw new Error('El registro es demasiado grande para guardarlo.');
  return { json: s.slice(0, TROZO), json2: s.slice(TROZO, TROZO * 2), json3: s.slice(TROZO * 2) };
}
function unir(r) { return String(r.json || '') + String(r.json2 || '') + String(r.json3 || ''); }
function leerJson(nombre) {
  return leer(nombre).map(r => { try { const o = JSON.parse(unir(r)); o.id = r.id; return o; } catch (e) { return null; } }).filter(Boolean);
}
function buscarJson(nombre, id) {
  const r = leer(nombre).find(x => x.id === id);
  if (!r) return null;
  try { return JSON.parse(unir(r)); } catch (e) { return null; }
}
function leerCfg(clave) {
  const r = leer('Config').find(x => x.clave === clave);
  if (!r) return null;
  try { return JSON.parse(String(r.valor || '') + String(r.valor2 || '') + String(r.valor3 || '')); } catch (e) { return null; }
}
function guardarCfg(clave, valor) {
  const s = JSON.stringify(valor);
  if (s.length > TROZO * 3) throw new Error('Los ajustes son demasiado grandes para guardarlos.');
  const hoja = hojaDe('Config'); const datos = hoja.getDataRange().getValues();
  const fila = [clave, s.slice(0, TROZO), s.slice(TROZO, TROZO * 2), s.slice(TROZO * 2), new Date()];
  const i = datos.findIndex((r, k) => k > 0 && r[0] === clave);
  if (i > 0) hoja.getRange(i + 1, 1, 1, fila.length).setValues([fila]);
  else hoja.appendRow(fila);
}

/* ---------------- Utilidades ---------------- */
function conCandado(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function esSi(v) { return v === true || v === 'TRUE' || v === 'true' || v === 1; }
// Evita que un texto que empiece por = + - @ se convierta en fórmula, y conserva ceros a la izquierda
function txt(v) {
  const s = String(v === undefined || v === null ? '' : v);
  return /^[=+\-@]|^0\d/.test(s) ? "'" + s : s;
}
