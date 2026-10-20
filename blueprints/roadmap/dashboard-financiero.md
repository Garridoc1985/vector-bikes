# Dashboard financiero y operativo del taller

> Pedido de Andrés del 20 de octubre de 2026, para fases posteriores a la fase 1.
> Estado: **en hoja de ruta**. No se construye hasta que la fase 1 lleve dos semanas en operación real sin papel (FASE1 §14.14).

## Objetivo

Que el dueño tenga, en una sola pantalla de `/taller`, la lectura completa del negocio: cuánto entró y salió, qué está moviendo el taller, cómo se convierten las consultas en trabajos y qué hay que revisar. Al terminar las fases posteriores, el panel tiene que estar **completo**, no solo con lo que la fase 1 ya permite calcular.

**Referencia:** el panel "Dashboard" de otro software de gestión de talleres que Andrés mostró el 20-10-2026. La captura no se versiona en este repositorio porque es de un tercero; aquí se describe su estructura. Se toma **solo la estructura**: el panel se construye con el diseño de Vector (monocromo, reglas de 1px, radio 2px, sin sombras ni degradados; gráficos en tinta y rayados, nunca solo color).

## Estructura del panel

1. **Encabezado:** rango de fechas "Desde / Hasta" con botón Aplicar, y sección de reportes descargables: reporte mensual, ingresos y egresos del período, y reporte por mecánico.
2. **Visión general, "El taller en una mirada":**
   - Cuatro indicadores principales: ingresos, ticket promedio, trabajos abiertos y balance neto, cada uno con su variación contra el período anterior.
   - Cuatro secundarios: ritmo del taller (trabajos por día activo), top 3 servicios por ingreso, clientes recurrentes y monto por revisar.
3. **Lectura financiera, "Cómo se movió el dinero":**
   - Evolución diaria de ingresos contra gastos, con promedio diario, mejor día y días con movimiento.
   - Resultado del período: balance, porcentaje retenido y relación gastos / ingresos.
   - Mix de ingresos: servicios, insumos y repuestos, ventas de caja.
4. **Pulso operativo, "Qué está moviendo el taller":** los 6 servicios más comunes, trabajos por día de la semana, trabajos por estado e histograma de antigüedad de los trabajos abiertos.
5. **Oportunidades, "De consultas a clientes":**
   - Cotizaciones: creadas, enviadas, aceptadas, canceladas, valor aceptado y conversión.
   - Agendamiento: reservas recibidas, pendientes, aceptadas, rechazadas y conversión.
   - Clientes: atendidos, nuevos, recurrentes y que volvieron.
6. **Control y calidad, "Una operación bajo control":**
   - Checklist y calidad: cobertura de checklist de ingreso y control de calidad, informes compartidos con el cliente.
   - Inventario: productos activos, stock bajo, sin stock y valor del inventario.
   - Registro de pago: órdenes sin pago registrado y monto por revisar.
7. **Metas:** meta de ingreso del período, ingreso proyectado y avance.

## Qué se puede calcular y desde cuándo

| Bloque o indicador | Fuente | Disponible desde |
|---|---|---|
| Ingresos, ticket promedio, monto por revisar, registro de pago | `payments`, `work_orders.total_clp` / `paid_clp` | Fase 1 (datos actuales) |
| Trabajos abiertos, por estado, por día de la semana, antigüedad | `work_orders`, `work_order_status_history` | Fase 1 |
| Servicios más comunes y top por ingreso | `work_order_items` + `services` | Fase 1 |
| Clientes nuevos, recurrentes y que volvieron | `customers` + `work_orders` | Fase 1 |
| Agendamiento (reservas por estado y conversión a orden) | `bookings` + `work_orders.booking_id` | Fase 1 |
| Cobertura de checklist, control de calidad e informes | `intake_checks`, `qc_checks`, `service_reports` | Fase 1 |
| Adicionales aprobados y rechazados | `work_order_approvals` | Fase 1 (cotización por orden; no hay cotizaciones sueltas) |
| Gastos, balance neto, porcentaje retenido, gastos / ingresos | Registro de gastos y costos de repuestos | Fase 2 |
| Mix servicios / insumos / caja | Inventario y caja POS | Fase 2 |
| Inventario: activos, stock bajo, sin stock, valor | Inventario | Fase 2 |
| Cotizaciones independientes de una orden | Entidad nueva de cotización | Por definir (fase 2 o posterior) |
| Variación contra período anterior, rango de fechas libre | Consultas por período | Fase 2 o posterior (ver decisión abajo) |
| Metas e ingreso proyectado | Configuración de metas | Fase 2 o posterior |
| Reportes descargables (mensual, ingresos y egresos, mecánicos) | Exportación PDF o Excel | Fase 2 o posterior |

## Etapas propuestas

- **Etapa A, indicadores con datos de la fase 1.** Una vez cumplidas las dos semanas de operación real, se puede adelantar todo lo marcado "Fase 1" en la tabla, en una pantalla `/taller/indicadores` solo para dueño y administración (permiso `dashboard.finance`). Ningún cambio de esquema: solo consultas.
- **Etapa B, junto con la fase 2.** Al construir caja, inventario y registro de gastos, se agregan balance, mix de ingresos, inventario y el reporte de ingresos y egresos. El diseño de la fase 2 debe guardar desde el primer día lo que estos indicadores necesitan: costo de cada repuesto, categoría de cada gasto y origen de cada venta.
- **Etapa C, cierre del panel.** Comparativas contra el período anterior, metas, reportes descargables y, si se decide, cotizaciones independientes.

## Decisión registrada

La especificación original deja fuera de la primera etapa las "comparativas financieras avanzadas por períodos" (§48) y dice que inicialmente no hacen falta (§40). El 20-10-2026 Andrés pidió incluir el panel completo en una fase posterior. Esa exclusión se levanta para la etapa C; la fase 1 no cambia.

## Reglas que se mantienen

- Montos e indicadores financieros solo para dueño y administración. Recepción y mecánico no ven montos ni márgenes (FASE1 §3.8).
- Todos los cálculos en el servidor, filtrados por `branch_id`; dinero en pesos enteros.
- Ningún dato personal de clientes en reportes descargables salvo lo que el dueño decida explícitamente.

## Preguntas abiertas

1. ¿Se registran gastos generales del taller (arriendo, sueldos, servicios) o solo costos de repuestos e insumos?
2. ¿Hacen falta cotizaciones sin orden de trabajo (un cliente que pregunta y no reserva), o basta con los adicionales de cada orden?
3. ¿Cómo se define la meta del período: un monto fijo mensual o una proyección?
4. ¿Formato de los reportes descargables: PDF, Excel o ambos?
