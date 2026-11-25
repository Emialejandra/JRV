# ControlElectoral

Aplicación móvil para la gestión y supervisión del proceso de escrutinio electoral, desarrollada con **Ionic Angular, Capacitor y Supabase**.

## 1. Descripción del proyecto

ControlElectoral es una aplicación móvil diseñada para facilitar la administración de recintos electorales, la asignación de responsables a las Juntas Receptoras del Voto (JRV) y el registro de resultados durante el proceso de escrutinio.

La aplicación permite organizar la información electoral, gestionar usuarios según sus responsabilidades, registrar actas y consultar el avance del proceso.

El sistema cuenta con tres perfiles de usuario:

- **Coordinador provincial:** administra los recintos electorales, crea coordinadores de recinto y consulta el avance del proceso.
- **Coordinador de recinto:** administra los veedores de su recinto, asigna JRV y supervisa las actas registradas.
- **Veedor de mesa:** consulta las mesas asignadas y registra los resultados de las actas electorales.

## 2. Objetivos

### Objetivo general

Desarrollar una aplicación móvil que permita gestionar y supervisar la información del proceso de escrutinio electoral mediante una plataforma organizada, segura y accesible.

### Objetivos específicos

- Implementar autenticación y control de acceso según roles.
- Gestionar recintos electorales y sus respectivas JRV.
- Administrar coordinadores y veedores.
- Registrar actas de alcalde y prefecto.
- Validar la consistencia matemática de los resultados electorales.
- Capturar fotografías de las actas y registrar su ubicación geográfica.
- Facilitar el seguimiento de las actividades mediante información centralizada.

## 3. Tecnologías utilizadas

| Tecnología | Utilización |
|---|---|
| Ionic | Desarrollo de la interfaz móvil. |
| Angular | Framework principal de la aplicación. |
| TypeScript | Lenguaje de programación. |
| Capacitor | Integración con funcionalidades nativas de Android. |
| Supabase | Backend, autenticación y persistencia de información. |
| PostgreSQL | Base de datos relacional. |
| Git y GitHub | Control de versiones y alojamiento del código. |

## 4. Funcionalidades principales

### Autenticación y usuarios
- Inicio de sesión mediante credenciales de usuario.
- Gestión de perfiles y roles.
- Cambio obligatorio de contraseña en el primer acceso.
- Recuperación de contraseña.
- Protección de rutas según el rol del usuario.

### Coordinación provincial
- Consulta y administración de recintos.
- Registro de coordinadores de recinto.
- Asignación de responsables.
- Consulta del avance del escrutinio.
- Visualización de información consolidada.

### Coordinación de recinto
- Consulta de las JRV pertenecientes al recinto.
- Registro de veedores.
- Asignación y reasignación de veedores.
- Supervisión de mesas y actas.
- Gestión de la información de las actas del recinto.

### Veedor de mesa
- Consulta de las JRV asignadas.
- Registro de actas de alcalde y prefecto.
- Ingreso de votos por las cinco organizaciones participantes.
- Registro de votos blancos, nulos y total de sufragantes.
- Validación de consistencia de resultados.
- Captura de fotografías de las actas.
- Registro de coordenadas GPS.

## 5. Arquitectura del proyecto

El proyecto utiliza una arquitectura modular por capas para separar las responsabilidades y facilitar el mantenimiento del código.

- **Presentación:** páginas, componentes y elementos de interfaz desarrollados con Ionic Angular.
- **Lógica de negocio:** servicios, validaciones y reglas necesarias para el funcionamiento de la aplicación.
- **Acceso a datos:** servicios encargados de realizar las operaciones con Supabase.
- **Modelos:** estructuras utilizadas para representar usuarios, recintos, JRV, asignaciones y actas.
- **Seguridad:** autenticación, autorización y políticas de acceso según los roles y las relaciones entre usuarios y recursos.

Las páginas no realizan consultas directas al backend; utilizan servicios especializados para gestionar la información.

## 6. Modelo de datos

La aplicación trabaja con entidades relacionadas con la administración electoral:

- **Perfiles:** información de los usuarios, identificación y rol.
- **Recintos:** información territorial de los recintos electorales.
- **JRV:** juntas receptoras del voto pertenecientes a cada recinto.
- **Asignaciones:** relación entre veedores y mesas asignadas.
- **Organizaciones y candidaturas:** participantes de las dignidades electorales.
- **Actas:** resultados registrados para las dignidades de alcalde y prefecto.

Las relaciones y restricciones de acceso se gestionan mediante la base de datos y las políticas de seguridad configuradas en Supabase.

## 7. Requisitos previos

Para ejecutar el proyecto se necesita:

- Node.js y npm.
- Ionic CLI.
- Angular CLI.
- Git.
- Un proyecto de Supabase configurado.
- Android Studio y JDK compatible con la versión de Gradle del proyecto, para generar la aplicación Android.

## 8. Instalación y ejecución

### Clonar el repositorio

```bash
git clone URL_DEL_REPOSITORIO
```

Ingresar a la carpeta del proyecto:

```bash
cd ControlElectoral
```

### Instalar dependencias

```bash
npm install
```

### Configurar Supabase

Configurar las credenciales del proyecto Supabase en los archivos de entorno correspondientes:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Se deben configurar las variables necesarias para la conexión con Supabase, utilizando los valores del propio proyecto.

**Importante:** no publicar claves privadas, contraseñas, tokens administrativos ni secretos del backend en el repositorio.

### Ejecutar la aplicación

```bash
ionic serve
```

La aplicación estará disponible en el navegador mediante la dirección local indicada por Ionic.

### Compilar el proyecto

```bash
npm run build
```

## 9. Pruebas y validaciones

Se deben verificar los siguientes escenarios de funcionamiento:

- Inicio de sesión y acceso según el rol.
- Cambio obligatorio de contraseña inicial.
- Recuperación de contraseña.
- Creación de coordinadores y veedores.
- Asignación y reasignación de JRV.
- Restricción de acceso a mesas no asignadas.
- Registro de actas de alcalde y prefecto.
- Validación de votos, blancos, nulos y total de sufragantes.
- Captura y validación de fotografías.
- Obtención y almacenamiento de coordenadas GPS.
- Consulta y actualización de la información registrada.

Las pruebas de aceptación deben ejecutarse con cuentas de los tres roles y comprobarse tanto en la aplicación como en el backend.

## 10. Configuración de demostración

Para realizar las pruebas se utilizarán cuentas de demostración correspondientes a los tres perfiles:

| Rol | Acceso |
|---|---|
| Coordinador provincial | Cuenta de demostración configurada en Supabase. |
| Coordinador de recinto | Cuenta de demostración configurada en Supabase. |
| Veedor de mesa | Cuenta de demostración configurada en Supabase. |

Las credenciales de prueba se proporcionarán por un medio controlado y no se incluirán contraseñas reales ni secretos en este repositorio.

## 11. Documentación técnica

Las decisiones arquitectónicas del proyecto se encuentran documentadas mediante registros ADR en:

```text
docs/adr/
```

Esta documentación recoge las decisiones relacionadas con las tecnologías, la arquitectura, la validación de información, el acceso a datos y las funcionalidades nativas.

## 12. Uso de inteligencia artificial

Durante el desarrollo se utilizaron herramientas de inteligencia artificial como apoyo para:

- Analizar los requisitos del examen.
- Proponer alternativas de implementación.
- Resolver errores de programación.
- Revisar y mejorar componentes y servicios.
- Apoyar la documentación técnica.
- Proponer y revisar pruebas de funcionamiento.

Las sugerencias generadas fueron revisadas, adaptadas y comprobadas mediante la ejecución de la aplicación, la inspección del código y las pruebas correspondientes.

El uso específico de herramientas, ejemplos de consultas, modificaciones aceptadas y verificaciones realizadas se detalla en el anexo individual de uso de inteligencia artificial.

## 13. Estado del proyecto

El proyecto se encuentra en fase de cierre y validación de los requisitos funcionales R1–R9 establecidos en el examen.

El requisito R10, correspondiente al funcionamiento offline y sincronización automática, se considera una funcionalidad para una nueva version de la app.

## 14. Autoría

**Estudiante:** Emilia Alejandra Tana Puga  
**Equipo:** Grupo 3  
**Asignatura:** Desarrollo de Aplicaciones Móviles  
**Institución:** Escuela de Formación de Tecnólogos (ESFOT) – Escuela Politécnica Nacional.

**Proyecto:** ControlElectoral.
