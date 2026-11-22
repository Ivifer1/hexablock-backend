# Checklist 2: Post-Implementation Gate (Verificación de Calidad y Arquitectura)

> **Regla de Oro:** Todo código implementado debe pasar este checklist antes de considerarse listo para revisión o commit.

## 1. Aislamiento e Invariantes de Clean Architecture
- [ ] `src/domain/` no importa NADA de capas externas (`@nestjs/*`, `express`, `@prisma/*`, `jsonwebtoken`, `bcrypt`, etc.).
- [ ] `src/application/` depende únicamente del dominio y puertos.
- [ ] **Ubicación de Repositorios:** Los repositorios concretos que importan `PrismaClient` residen en Capa 4 (`infrastructure/repositories/`), implementando los puertos de Capa 2. Jamás importar `PrismaClient` en capas internas.
- [ ] Sin `console.log` en lógica de negocio (usar decoradores AOP de logging / trazabilidad).
- [ ] Sin lógica de gameplay en el backend: el backend almacena contratos y configuraciones (`data` como JSON opaco indexado por `gameId`), sin simular físicas ni resolver tableros.

## 2. SOLID y Patrones GoF
- [ ] **SRP:** Controladores solo manejan HTTP/DTO; casos de uso solo orquestan; repositorios solo persisten.
- [ ] **OCP:** Soportar nuevas variantes mediante configuración y `gameId`, sin añadir `switch(gameId)` en el flujo común de progreso o niveles.
- [ ] **DIP:** Casos de uso inyectan interfaces de repositorio (`IProgressRepository`, `ILevelRepository`).
- [ ] **AOP:** Manejo centralizado de excepciones y logging implementado con interceptores/filtros/decoradores limpios.

## 3. Estándares de Testing
- [ ] **Tests Unitarios sin base de datos ni red:** Uso de In-Memory Fakes (`Map`-based) para repositorios en pruebas unitarias (`test:unit`), garantizando ejecución en milisegundos y cero I/O.
- [ ] **Tests de Integración aislados:** `test:integration` ejecutados contra base de datos limpia desechable.
- [ ] Nomenclatura obligatoria: `should_<resultado_esperado>_when_<condicion>` con metodología AAA.
- [ ] *State over Interaction*: Aserciones sobre estado y DTOs devueltos; `vi.fn()` reservado solo para interceptores/decoradores.

## 4. Verificación Automatizada
- [ ] `npm run typecheck` pasa con 0 errores.
- [ ] `npm run lint` pasa con 0 errores.
- [ ] `npm run test:unit` pasa al 100%.
