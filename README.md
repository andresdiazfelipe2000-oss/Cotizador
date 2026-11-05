# Cotizador Tercio Creativo S.A.S. – versión Google Sheets

Página web para cotizar trabajos de personalización, con inicio de sesión, dos roles y todos los
datos guardados en una hoja de cálculo de Google Drive. Gratis con una cuenta de Gmail.

- **Administrador:** Cotizar, Cotizaciones, Clientes, Panel, Ajustes y Usuarios.
- **Empleado:** Cotizar y Cotizaciones del equipo, sin costos internos, márgenes ni utilidades.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La aplicación completa |
| `api-config.js` | Dirección de la base de datos (se llena después de publicar Code.gs) |
| `Code.gs` | Programa que se pega dentro de la hoja de Google (Extensiones → Apps Script). **No se sube a GitHub** (no hace daño si se sube) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Permiten instalar la página como app desde Chrome |

## Resumen de la instalación

1. **Hoja de cálculo:** en drive.google.com crea una hoja nueva llamada *Base de datos Cotizador*.
2. **Programa:** en la hoja, Extensiones → Apps Script. Borra lo que haya, pega todo `Code.gs` y guarda.
3. **Publicar:** Implementar → Nueva implementación → tipo *Aplicación web*. Ejecutar como: **Yo**.
   Quién tiene acceso: **Cualquier persona**. Implementar, autorizar y copiar la URL que termina en `/exec`.
4. **GitHub:** crea el repositorio `cotizador` (público), sube `index.html`, `api-config.js`,
   `manifest.webmanifest`, `sw.js` y la carpeta `icons`. Edita `api-config.js` y reemplaza `null`
   por la URL entre comillas. Activa Settings → Pages → rama main, carpeta raíz.
5. **Primer uso:** abre `https://TU-USUARIO.github.io/cotizador/`, crea el administrador y luego los
   empleados en Usuarios.

La guía completa, paso a paso y desde cero, está en el documento que acompaña este archivo.

## Dónde quedan los datos

En la hoja de cálculo, una pestaña por tipo de dato: **Usuarios** (contraseñas cifradas), **Sesiones**,
**Clientes**, **Cotizaciones** (con columnas de número, fecha, cliente, estado, subtotal, IVA, total,
costo y utilidad, listas para filtrar o hacer tablas dinámicas) y **Config** (ajustes y consecutivo).
No edites a mano las columnas `json`: ahí está el detalle que usa la página.

## Si cambias Code.gs

Apps Script → Implementar → Gestionar implementaciones → lápiz → Versión: **Nueva versión** →
Implementar. Así la URL no cambia.
