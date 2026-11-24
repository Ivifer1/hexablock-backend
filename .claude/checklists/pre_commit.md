# Checklist 3: Pre-Commit & PR Gate (Auditoría y Trazabilidad)

> **Regla de Oro:** No se realiza ningún commit o Pull Request sin cumplir esta verificación.

## 1. Actualización de Documentación y Trazabilidad
- [ ] El change record en `docs/ai/change-records/<branch>.md` fue actualizado con las secciones:
  - *Implementation notes* (archivos creados/modificados).
  - *Verification* (comandos ejecutados y salida de tests).
  - *Status: IMPLEMENTED*.
- [ ] Documentación OpenAPI / Swagger actualizada para nuevos endpoints o DTOs.

## 2. Registro de Uso de IA (`AI_USAGE.md`) con Sección de Anomalías
- [ ] Se añadió la entrada correspondiente en `AI_USAGE.md` con:
  - Herramienta y modelo exacto.
  - Tarea y prompt utilizado (paráfrasis fiel).
  - Resultado obtenido.
  - Modificaciones del equipo.
  - **Anomalías / Errores de la IA detectados por el equipo:** Registro explícito de sugerencias erróneas, tipos mal importados o diagnósticos falsos de la IA y cómo se corrigieron.
  - Lecciones aprendidas.

## 3. Convenciones de Commit y Git
- [ ] Commits en inglés siguiendo **Conventional Commits**:
  - `feat(<scope>): ...` para nuevas funcionalidades/endpoints.
  - `test(<scope>): ...` para pruebas unitarias/integración.
  - `chore(<scope>): ...` para tareas de mantenimiento y harness.
  - `docs(<scope>): ...` para documentación y change records.
- [ ] Jamás usar `--no-verify` ni forzar (`--force`).
- [ ] Explicación final en español (`## Explicación del cambio`) incluida en la entrega del turno.
