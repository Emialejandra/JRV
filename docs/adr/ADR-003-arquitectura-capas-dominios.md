# ADR-003 — Arquitectura de aplicación por capas y dominios (Core, Shared, Features)

## Estado
Aceptado

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz (Grupo 3)

## Requisitos relacionados
R4, R5, R6, R8, R9 (Separación explícita entre presentación, lógica de negocio y acceso a datos; modularización por roles y trazabilidad arquitectónica).

## Contexto
La aplicación contempla flujos aislados para tres roles (Coordinador Provincial, Coordinador de Recinto y Veedor), además de servicios transversales (autenticación, almacenamiento, cámara y GPS). Invocar directamente al cliente de Supabase desde los componentes visuales violaría el requisito R9 de separación de capas y dificultaría la defensa individual.

## Alternativas consideradas

### Arquitectura por dominios y capas (Core, Shared, Features)
**Ventajas:** Aísla presentación (pages), lógica de negocio (services/validators) y acceso a datos (models/repositorios); organiza los módulos por rol/flujo y evita llamadas directas al backend desde las páginas.

**Desventajas/riesgos:** Genera una mayor cantidad de carpetas y archivos, exigiendo disciplina en convenciones de nombres.

### Estructura plana global (pages/ y services/ generales)
**Ventajas:** Rapidez inicial con pocos directorios.

**Desventajas/riesgos:** Mezcla vistas y servicios de los tres roles en carpetas globales, aumentando el acoplamiento y dificultando la trazabilidad en la defensa.

## Decisión
Se adopta una arquitectura por dominios y capas bajo `src/app/`:

1. **Core:** servicios transversales (auth, storage, cámara, GPS, guards y modelos).
2. **Shared:** componentes visuales reutilizables y validadores puros.
3. **Features:** módulos aislados por flujo/rol (auth, provincial, recinto, veedor).

**Regla estricta:** Ningún archivo `*.page.ts` podrá acceder directamente a Supabase (ni Firebase).

## Consecuencias
**Beneficios:** Cumplimiento estricto de R9, bajo acoplamiento, facilidad de crecimiento y trazabilidad inmediata durante la defensa presencial.

**Obligaciones:** Encapsular toda consulta a Supabase dentro de servicios dedicados.

**Riesgo:** Mayor número de archivos y carpetas; mitigado manteniendo una convención uniforme en los tres repositorios.

## Verificación
Inspección de la estructura de carpetas `src/app/core`, `src/app/shared` y `src/app/features`; auditoría estática comprobando que ningún archivo `*.page.ts` importe directamente `@supabase/supabase-js`.

## Uso de IA
**Herramienta:** Gemini / Microsoft Copilot.

**Consulta:** Organización modular en capas para Ionic Angular Standalone con tres roles y backend desacoplado.

**Aceptación/verificación:** Aceptado y adaptado a la regla de prohibición de llamadas directas al backend desde páginas.

## Trazabilidad
**Commit de ADR:** Pendiente de registrar/enlazar.

**Commit de implementación:** Pendiente de registrar/enlazar.

## Consenso del equipo
- **Gabriel Emilio Toaquiza Saenz:** Presentó la propuesta destacando trazabilidad, bajo acoplamiento, prohibición de acceso directo al backend desde páginas y alineación con R4, R5, R6, R8 y R9.
- **Alex Mateo Barba Gavidia:** Apoyó la organización por capas señalando que facilita la trazabilidad y el manejo de los tres roles.
- **Emilia Alejandra Tana Puga:** Señaló que facilita el seguimiento y desarrollo de requisitos, considerándola accesible para el equipo.
- **Objeciones y acuerdo:** Se identificó el riesgo de mayor cantidad de archivos y la necesidad de disciplina; aprobado por unanimidad. Minuto del video: 10:09 – 18:28.
