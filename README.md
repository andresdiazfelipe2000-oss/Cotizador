# Cotizador Tercio Creativo S.A.S.

Página web para cotizar trabajos de personalización (DTF textil, UV DTF, UV directa, láser,
termofijado y laminado), con inicio de sesión, dos roles de usuario y base de datos en la
nube con Firebase.

- **Administrador:** acceso a todo: Cotizar, Cotizaciones, Clientes, Panel, Ajustes y Usuarios.
- **Empleado:** Cotizar y Cotizaciones. Ve y usa los clientes y cotizaciones de todo el equipo, pero no ve costos internos, márgenes ni utilidades, y no entra a Clientes, Panel, Ajustes ni Usuarios.

Todo se guarda en Firebase (plan gratuito Spark, sin tarjeta) y se sincroniza entre equipos.

---

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La aplicación completa |
| `firebase-config.js` | Datos de conexión a tu proyecto de Firebase (se llena en el paso 2) |
| `firestore.rules` | Reglas de seguridad de la base de datos (se pegan en Firebase en el paso 1) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Permiten instalar la página como app desde Chrome |
| `firebase.json`, `firestore.indexes.json` | Solo si prefieres publicar con Firebase Hosting (opcional) |

---

## Paso 1. Crear el proyecto en Firebase (una sola vez, unos 10 minutos)

1. Entra a **https://console.firebase.google.com** con la cuenta de Google de la empresa y pulsa
   **Crear un proyecto**. Nombre sugerido: `tercio-cotizador`. Google Analytics no es necesario.
2. **Base de datos:** en el menú, *Compilación → Firestore Database → Crear base de datos*.
   Elige la ubicación más cercana disponible (por ejemplo `southamerica-east1`) y el modo de producción.
3. **Reglas:** dentro de Firestore, pestaña **Reglas**. Borra lo que haya, pega todo el contenido
   del archivo `firestore.rules` y pulsa **Publicar**.
4. **Inicio de sesión:** *Compilación → Authentication → Comenzar → Método de acceso* y activa
   **Correo electrónico/contraseña**.
5. **App web:** en *Configuración del proyecto* (ícono de engranaje) → *Tus apps* → ícono `</>`.
   Ponle un nombre (por ejemplo "Cotizador") y pulsa **Registrar app**. Copia el bloque
   `firebaseConfig` que aparece.

## Paso 2. Conectar la página con Firebase

Abre `firebase-config.js` con el Bloc de notas (o directamente en GitHub con el lápiz de editar) y
reemplaza `null` por los datos que copiaste. Debe quedar así, con tus valores:

```js
window.TERCIO_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "tercio-cotizador.firebaseapp.com",
  projectId: "tercio-cotizador",
  storageBucket: "tercio-cotizador.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

Si lo dejas vacío, la página te pedirá estos datos la primera vez que la abras y te dará el texto
exacto para pegar en este archivo.

> La `apiKey` de Firebase no es secreta: identifica el proyecto. Lo que protege los datos son las
> reglas del paso 1.3.

## Paso 3. Publicar en GitHub Pages (gratis, con https)

1. Entra a **https://github.com** e inicia sesión (o crea una cuenta gratuita).
2. Pulsa **New repository**. Nombre: `cotizador`. Visibilidad: **Public** (GitHub Pages gratuito
   lo requiere; los datos de clientes no quedan en el repositorio, quedan en Firebase).
3. En el repositorio nuevo: **Add file → Upload files**. Arrastra **todo el contenido** de esta
   carpeta (incluida la carpeta `icons`) y pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta
   **/ (root)** y pulsa **Save**.
5. En uno o dos minutos la página queda en:
   `https://TU-USUARIO.github.io/cotizador/`
6. En Firebase: *Authentication → Configuración → Dominios autorizados → Agregar dominio* y
   escribe `TU-USUARIO.github.io`.

Si prefieres la terminal:

```bash
git init
git add .
git commit -m "Cotizador Tercio Creativo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/cotizador.git
git push -u origin main
```

## Paso 4. Crear el administrador

Abre la dirección de tu página. La primera vez aparece **Configuración inicial**: escribe los datos
de la empresa (razón social, NIT, dirección, teléfono, correo) y los del administrador (nombre,
correo y contraseña). Al terminar, entras directamente al cotizador.

Esta pantalla solo aparece una vez: después, la página siempre pide usuario y contraseña.

## Paso 5. Crear los demás usuarios

Como administrador, entra a **Usuarios**:

- **Crear usuario:** nombre, correo, contraseña inicial y rol (Administrador o Empleado).
  Entrégale la contraseña a la persona; puede cambiarla con *Olvidé mi contraseña*.
- Solo el administrador crea cuentas: nadie puede registrarse por su cuenta desde la pantalla de ingreso.
- **Quitar el acceso:** desmarca *Activo*. La persona no podrá entrar aunque sepa su contraseña.

## Instalar como app en Chrome

Abre la página en Chrome. En la barra de direcciones aparece el ícono **Instalar** (o menú ⋮ →
*Transmitir, guardar y compartir → Instalar página como app*). Queda con su ícono en el escritorio
y en el celular, y se abre en su propia ventana.

## Datos que ya tenías en el navegador

Si usaste la versión anterior (sin nube) en algún equipo, entra como administrador desde ese mismo
equipo y ve a **Ajustes → Respaldo → Subir a la nube lo guardado en este navegador**.

## Límites del plan gratuito de Firebase

50.000 lecturas y 20.000 escrituras al día y 1 GB de datos. El plan Spark no pide tarjeta y nunca
cobra: si se llegara al límite, la base de datos deja de responder hasta el día siguiente. Para un
taller esto equivale a cientos de miles de cotizaciones.

Las imágenes que se suben para la vista previa no se guardan en la nube (el almacenamiento de
archivos de Firebase exige el plan de pago). Se usan en el momento y se pueden descargar como PNG.

## Publicar con Firebase Hosting (opcional, en lugar de GitHub Pages)

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # elige tu proyecto
firebase deploy               # sube la página y las reglas
```

La página queda en `https://TU-PROYECTO.web.app`.
