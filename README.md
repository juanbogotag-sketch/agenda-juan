# Agenda

Agenda personal de Juan Pablo González Bogotá, pasante en la Embajada de Colombia en Washington.

Calendario **semanal** (lunes a domingo), pensado para abrirse desde el celular: cada evento lleva fecha, hora, lugar y asistentes. Tocando un evento se ve quién va a ir; tocando un asistente se ven su foto, cargo, organización, biografía y datos de contacto, sin salir de la agenda.

## Privacidad

- **Los eventos viven solo en el dispositivo** (localStorage, clave `agenda_juan_v1`). Nada se envía a ningún servidor ni se comparte con nadie.
- No hay registro, ni token, ni puerta de acceso: la agenda es personal porque los datos no salen del teléfono.
- No hay service worker a propósito, para que el navegador nunca sirva una copia vieja en caché.

## De dónde salen los perfiles

- Los perfiles se cargan en vivo del Repositorio (`js/datos_foro.js` del sitio `organigramas-dod-jcs`). Si un perfil cambia allí, la agenda lo refleja al recargar.
- Los contactos están en `js/contactos.js`, una **foto fija** del objeto `CONTACTOS_EX` del Repositorio, copiada el 19 nov 2026 (88 perfiles con contacto). No se actualiza sola: si un contacto cambia en el Repositorio, hay que volver a copiarlo aquí.

## Archivos

- `index.html` — página única.
- `css/agenda.css` — estilos, móvil primero.
- `js/agenda.js` — calendario semanal, eventos y perfiles de asistentes.
- `js/contactos.js` — contactos (foto fija del Repositorio).
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — para añadir la agenda a la pantalla de inicio del celular.

## Uso

1. Abre la página en el celular y usa «Añadir a pantalla de inicio».
2. Pulsa **+** para crear un evento: nombre, fecha, hora de inicio y fin, lugar y asistentes.
3. Los asistentes se buscan en el Repositorio por nombre, cargo u organización, o se añaden a mano como personas externas (nombre, correo, teléfono).
4. Toca un evento para ver el detalle y a sus asistentes; toca un asistente para ver su perfil, contacto y foto.
