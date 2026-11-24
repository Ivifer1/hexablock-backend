# Checklist 1: Pre-Implementation Gate (Aprobación Obligatoria)

> **Regla de Oro:** NINGÚN agente ni desarrollador debe escribir o modificar código en `src/**` sin haber completado este checklist y recibido la aprobación explícita (`Status: APPROVED`) del equipo humano.

## 1. Verificación de Especificación (Spec First)
- [ ] ¿El endpoint o caso de uso cuenta con una especificación de contrato en `docs/specs/` o requisitos de backend (`FR-###`)?
- [ ] ¿Están definidos el método HTTP, la ruta, los códigos de estado de éxito (200/201), errores tipados (400/401/404/409/422/500) y el esquema del DTO (`gameId` incluido)?
- [ ] Si hay ambigüedad en el contrato cliente-servidor, ¿se consultó con el equipo antes de asumir decisiones de implementación?

## 2. Propuesta de Diseño (Change Record)
- [ ] Se creó la rama de trabajo según la convención (`feat/*`, `review/*`).
- [ ] Se copió `docs/ai/change-records/TEMPLATE.md` a `docs/ai/change-records/<branch>.md`.
- [ ] El archivo tiene `Status: PROPOSED`.
- [ ] Se detalló la arquitectura por capas (**Clean Architecture**):
  - Entidades en Capa 1 (`src/domain/entities/`).
  - Casos de uso e interfaces de repositorios (puertos) en Capa 2 (`src/domain/` o `src/application/ports/`).
  - Controladores y mappers en Capa 3 (`src/application/` o `src/interfaces/http/`).
  - Repositorios concretos (Prisma/DB) en Capa 4 (`src/infrastructure/repositories/`) para respetar la regla hacia adentro.
- [ ] Se justificaron los principios **SOLID** y **Patrones GoF** (Adapter, Decorator AOP, Strategy, Factory).

## 3. Puerta de Aprobación Humana (STOP GATE)
- [ ] Se presentó la propuesta formal en español al equipo.
- [ ] **UN HUMANO cambió el estado a `Status: APPROVED`.**
- [ ] Los tests unitarios (`test/**`) pueden prepararse, pero `src/**` permanece bloqueado hasta el visto bueno explícito.
