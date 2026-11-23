# ADR-004 — Formularios Reactivos (Reactive Forms) y validadores puros de negocio

## Estado
Aceptado

## Fecha
2026-11-21

## Autor(es) y equipo
Alex Mateo Barba Gavidia, Emilia Alejandra Tana Puga, Gabriel Emilio Toaquiza Saenz (Grupo 3)

## Requisitos relacionados
R2, R3, R4, R5, R6, R9 (Validación algorítmica de cédula ecuatoriana, cuadre matemático de actas de escrutinio, cambio obligatorio de contraseña inicial y mensajes explícitos de validación).

## Contexto
El dominio electoral exige validaciones críticas antes de persistir datos:

1. Cédula ecuatoriana de 10 dígitos mediante código de provincia, tercer dígito y algoritmo módulo 10 (R2, R3).
2. Consistencia matemática en actas de Alcaldía y Prefectura donde votos de 5 organizaciones + blancos + nulos debe igualar al total de sufragantes (R6).
3. Bloqueo de reutilización de la clave inicial `Ecuador2026` (R3).

## Alternativas consideradas

### Angular Reactive Forms + validadores puros reutilizables
**Ventajas:** Nativo en Angular sin librerías extra; permite validaciones cruzadas síncronas a nivel de `FormGroup` para el cuadre de actas, control granular de errores por campo (R9) y funciones puras fáciles de probar.

**Desventajas/riesgos:** Requiere conversión numérica estricta al leer valores desde componentes `IonInput` para evitar concatenación de cadenas.

### Template-Driven Forms (`ngModel`)
**Ventajas:** Menor configuración TypeScript en formularios simples.

**Desventajas/riesgos:** Dificulta coordinar validaciones cruzadas complejas entre múltiples campos numéricos del acta y acopla la lógica de negocio a la plantilla HTML.

## Decisión
Se elige Angular Reactive Forms acompañado de validadores puros reutilizables en `src/app/shared/validators/`:

1. Validador de cédula ecuatoriana (provincia 01–24, tercer dígito < 6 y módulo 10).
2. Validador cruzado de cuadre de actas a nivel de `FormGroup`.
3. Validador de cambio obligatorio de contraseña inicial.
4. Conversión numérica estricta y mensajes visibles de validación en UI.

## Consecuencias
**Beneficios:** Validación en tiempo real del cuadre de votos, cero dependencias externas adicionales y alta reutilización entre formularios de distintos roles.

**Obligaciones:** Mostrar mensajes descriptivos de error en cada campo inválido y bloquear el envío mientras el formulario sea inválido.

**Riesgo:** Interpretación de valores de `IonInput type='number'` como string al sumar votos; mitigado aplicando conversión explícita `Number()` antes de evaluar la sumatoria.

## Verificación
Archivos de validadores en `src/app/shared/validators/`; pruebas con cédulas válidas e inválidas y simulación de acta descuadrada comprobando bloqueo del botón guardar y mensaje explícito.

## Uso de IA
**Herramienta:** Gemini / Microsoft Copilot.

**Consulta:** Implementación de validador módulo 10 de cédula ecuatoriana y validador cruzado `FormGroup` para cuadre de actas en Ionic Angular.

**Aceptación/verificación:** Aceptado y verificado frente a casos borde de casteo numérico en `IonInput`.

## Trazabilidad
**Commit de ADR:** Pendiente de registrar/enlazar.

**Commit de implementación:** Pendiente de registrar/enlazar.

## Consenso del equipo
- **Gabriel Emilio Toaquiza Saenz:** Expuso las validaciones críticas (cédula módulo 10, cuadre matemático de actas y cambio de clave), destacando reutilización, pruebas unitarias y control de estado.
- **Alex Mateo Barba Gavidia:** Apoyó aprovechar herramientas nativas de Angular rechazando agregar librerías externas innecesarias.
- **Emilia Alejandra Tana Puga:** Manifestó acuerdo total con la propuesta.
- **Objeciones y acuerdo:** Se advirtió el riesgo de concatenación de strings en `IonInput` numérico, resolviéndose con casteo estricto; aprobado por unanimidad. Minuto del video: 18:28 – 25:06.
