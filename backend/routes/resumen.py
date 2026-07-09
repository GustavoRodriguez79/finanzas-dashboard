# routes/resumen.py
# Endpoints para el dashboard y resumen financiero.
# Calcula métricas clave: balance, ahorro, comparativas y proyecciones.
# Todos los endpoints requieren JWT válido — Depends(get_current_user).

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import date
from database import get_connection, release_connection
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ══════════════════════════════════════════
#  RESUMEN DEL MES — DASHBOARD PRINCIPAL
# ══════════════════════════════════════════

@router.get("/mes")
def resumen_mes(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna el resumen financiero completo del mes indicado.
    Si no se pasan parámetros usa el mes y año actuales.
    Incluye: ingresos, gastos, balance, % ahorro, top categorías
    y comparativa con el mes anterior.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        hoy = date.today()
        mes = mes or hoy.month
        anio = anio or hoy.year

        # ─── Total ingresos del mes ───
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM ingresos
            WHERE usuario_id = %s
            AND EXTRACT(MONTH FROM fecha) = %s
            AND EXTRACT(YEAR FROM fecha) = %s
        """, (current_user["id"], mes, anio))
        total_ingresos = float(cursor.fetchone()[0])

        # ─── Total gastos del mes (no anulados) ───
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM gastos
            WHERE usuario_id = %s
            AND EXTRACT(MONTH FROM fecha) = %s
            AND EXTRACT(YEAR FROM fecha) = %s
            AND anulado = FALSE
        """, (current_user["id"], mes, anio))
        total_gastos = float(cursor.fetchone()[0])

        # ─── Balance y % ahorro ───
        balance = total_ingresos - total_gastos
        porcentaje_ahorro = (
            round((balance / total_ingresos * 100), 1)
            if total_ingresos > 0 else 0
        )

        # ─── Gastos por categoría ───
        cursor.execute("""
            SELECT categoria, SUM(monto) as total
            FROM gastos
            WHERE usuario_id = %s
            AND EXTRACT(MONTH FROM fecha) = %s
            AND EXTRACT(YEAR FROM fecha) = %s
            AND anulado = FALSE
            GROUP BY categoria
            ORDER BY total DESC
        """, (current_user["id"], mes, anio))
        gastos_por_categoria = [
            {"categoria": row[0], "total": float(row[1])}
            for row in cursor.fetchall()
        ]

        # ─── Categoría con mayor gasto ───
        categoria_top = gastos_por_categoria[0] if gastos_por_categoria else {
            "categoria": "Sin gastos", "total": 0
        }

        # ─── Comparativa con mes anterior ───
        mes_anterior = mes - 1 if mes > 1 else 12
        anio_anterior = anio if mes > 1 else anio - 1

        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM gastos
            WHERE usuario_id = %s
            AND EXTRACT(MONTH FROM fecha) = %s
            AND EXTRACT(YEAR FROM fecha) = %s
            AND anulado = FALSE
        """, (current_user["id"], mes_anterior, anio_anterior))
        gastos_mes_anterior = float(cursor.fetchone()[0])

        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM ingresos
            WHERE usuario_id = %s
            AND EXTRACT(MONTH FROM fecha) = %s
            AND EXTRACT(YEAR FROM fecha) = %s
        """, (current_user["id"], mes_anterior, anio_anterior))
        ingresos_mes_anterior = float(cursor.fetchone()[0])

        # Variación porcentual respecto al mes anterior
        variacion_gastos = (
            round(((total_gastos - gastos_mes_anterior) / gastos_mes_anterior * 100), 1)
            if gastos_mes_anterior > 0 else 0
        )

        # ─── Proyección del mes ───
        # Si estamos en el mes actual proyecta el gasto total
        # basándose en el promedio diario hasta hoy
        proyeccion_gasto_mes = 0
        if mes == hoy.month and anio == hoy.year and hoy.day > 0:
            dias_transcurridos = hoy.day
            dias_en_mes = 30  # Aproximación
            gasto_diario_promedio = total_gastos / dias_transcurridos
            proyeccion_gasto_mes = round(
                gasto_diario_promedio * dias_en_mes, 2
            )

        # ─── Presupuestos con alertas ───
        cursor.execute("""
            SELECT p.categoria, p.monto_limite,
                   COALESCE(SUM(g.monto), 0) as gastado
            FROM presupuestos p
            LEFT JOIN gastos g ON
                g.usuario_id = p.usuario_id
                AND g.categoria = p.categoria
                AND EXTRACT(MONTH FROM g.fecha) = p.mes
                AND EXTRACT(YEAR FROM g.fecha) = p.anio
                AND g.anulado = FALSE
            WHERE p.usuario_id = %s AND p.mes = %s AND p.anio = %s
            GROUP BY p.categoria, p.monto_limite
        """, (current_user["id"], mes, anio))

        alertas = []
        for row in cursor.fetchall():
            limite = float(row[1])
            gastado = float(row[2])
            porcentaje = (gastado / limite * 100) if limite > 0 else 0
            if porcentaje >= 80:
                alertas.append({
                    "categoria": row[0],
                    "limite": limite,
                    "gastado": gastado,
                    "porcentaje": round(porcentaje, 1),
                    "superado": porcentaje >= 100
                })

        return {
            "mes": mes,
            "anio": anio,
            "total_ingresos": total_ingresos,
            "total_gastos": total_gastos,
            "balance": balance,
            "porcentaje_ahorro": porcentaje_ahorro,
            "categoria_top": categoria_top,
            "gastos_por_categoria": gastos_por_categoria,
            "comparativa": {
                "gastos_mes_anterior": gastos_mes_anterior,
                "ingresos_mes_anterior": ingresos_mes_anterior,
                "variacion_gastos": variacion_gastos
            },
            "proyeccion_gasto_mes": proyeccion_gasto_mes,
            "alertas_presupuesto": alertas
        }

    except Exception as e:
        logger.error(f"Error en resumen del mes: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  RESUMEN ANUAL
# ══════════════════════════════════════════

@router.get("/anual")
def resumen_anual(
    anio: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna el resumen financiero de los 12 meses del año.
    Incluye: totales anuales, % ahorro anual y detalle mes a mes.
    Similar a la hoja Resumen Anual de tu Excel.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        hoy = date.today()
        anio = anio or hoy.year

        # ─── Totales anuales ───
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM ingresos
            WHERE usuario_id = %s
            AND EXTRACT(YEAR FROM fecha) = %s
        """, (current_user["id"], anio))
        total_ingresos_anual = float(cursor.fetchone()[0])

        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM gastos
            WHERE usuario_id = %s
            AND EXTRACT(YEAR FROM fecha) = %s
            AND anulado = FALSE
        """, (current_user["id"], anio))
        total_gastos_anual = float(cursor.fetchone()[0])

        balance_anual = total_ingresos_anual - total_gastos_anual
        porcentaje_ahorro_anual = (
            round((balance_anual / total_ingresos_anual * 100), 1)
            if total_ingresos_anual > 0 else 0
        )

        # ─── Detalle mes a mes ───
        meses = []
        NOMBRES_MESES = [
            "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]

        for m in range(1, 13):
            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0)
                FROM ingresos
                WHERE usuario_id = %s
                AND EXTRACT(MONTH FROM fecha) = %s
                AND EXTRACT(YEAR FROM fecha) = %s
            """, (current_user["id"], m, anio))
            ingresos_mes = float(cursor.fetchone()[0])

            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0)
                FROM gastos
                WHERE usuario_id = %s
                AND EXTRACT(MONTH FROM fecha) = %s
                AND EXTRACT(YEAR FROM fecha) = %s
                AND anulado = FALSE
            """, (current_user["id"], m, anio))
            gastos_mes = float(cursor.fetchone()[0])

            balance_mes = ingresos_mes - gastos_mes
            ahorro_mes = (
                round((balance_mes / ingresos_mes * 100), 1)
                if ingresos_mes > 0 else 0
            )

            meses.append({
                "mes": m,
                "nombre": NOMBRES_MESES[m],
                "ingresos": ingresos_mes,
                "gastos": gastos_mes,
                "balance": balance_mes,
                "porcentaje_ahorro": ahorro_mes
            })

        # ─── Mes más caro y más económico ───
        meses_con_gastos = [m for m in meses if m["gastos"] > 0]
        mes_mas_caro = max(
            meses_con_gastos, key=lambda x: x["gastos"]
        ) if meses_con_gastos else None
        mes_mas_economico = min(
            meses_con_gastos, key=lambda x: x["gastos"]
        ) if meses_con_gastos else None

        # ─── Gastos por categoría anual ───
        cursor.execute("""
            SELECT categoria, SUM(monto) as total,
                   ROUND(SUM(monto) * 100.0 / NULLIF(
                       SUM(SUM(monto)) OVER (), 0
                   ), 1) as porcentaje
            FROM gastos
            WHERE usuario_id = %s
            AND EXTRACT(YEAR FROM fecha) = %s
            AND anulado = FALSE
            GROUP BY categoria
            ORDER BY total DESC
        """, (current_user["id"], anio))

        gastos_por_categoria = [
            {
                "categoria": row[0],
                "total": float(row[1]),
                "porcentaje": float(row[2]) if row[2] else 0
            }
            for row in cursor.fetchall()
        ]

        return {
            "anio": anio,
            "total_ingresos": total_ingresos_anual,
            "total_gastos": total_gastos_anual,
            "balance_anual": balance_anual,
            "porcentaje_ahorro_anual": porcentaje_ahorro_anual,
            "mes_mas_caro": mes_mas_caro,
            "mes_mas_economico": mes_mas_economico,
            "gastos_por_categoria": gastos_por_categoria,
            "meses": meses
        }

    except Exception as e:
        logger.error(f"Error en resumen anual: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)