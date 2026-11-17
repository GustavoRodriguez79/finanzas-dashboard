# routes/asistente.py
# Endpoint del Asistente IA — usa Anthropic API con contexto financiero del usuario.
# Solo disponible para usuarios con plan premium.

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_connection, release_connection
from auth import get_current_user
import anthropic
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Schema ───

class PreguntaAsistente(BaseModel):
    pregunta: str
    mes: int | None = None
    anio: int | None = None


# ─── Helper: obtener contexto financiero del usuario ───

def obtener_contexto_financiero(usuario_id: int, mes: int | None, anio: int | None) -> str:
    """
    Consulta la DB y arma un resumen financiero del usuario
    para usar como contexto en el prompt del asistente.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Filtros de fecha
        filtro_mes = ""
        params_base = [usuario_id]

        if mes and anio:
            filtro_mes = "AND EXTRACT(MONTH FROM fecha) = %s AND EXTRACT(YEAR FROM fecha) = %s"
            params_gastos = [usuario_id, mes, anio]
            params_ingresos = [usuario_id, mes, anio]
            periodo = f"{mes}/{anio}"
        elif anio:
            filtro_mes = "AND EXTRACT(YEAR FROM fecha) = %s"
            params_gastos = [usuario_id, anio]
            params_ingresos = [usuario_id, anio]
            periodo = f"año {anio}"
        else:
            params_gastos = [usuario_id]
            params_ingresos = [usuario_id]
            periodo = "todos los registros"

        # Total gastos por categoría
        query_gastos = f"""
            SELECT categoria, SUM(monto) as total, COUNT(*) as cantidad
            FROM gastos
            WHERE usuario_id = %s AND anulado = FALSE {filtro_mes}
            GROUP BY categoria
            ORDER BY total DESC
        """
        cursor.execute(query_gastos, params_gastos)
        gastos_por_cat = cursor.fetchall()

        # Total ingresos
        query_ingresos = f"""
            SELECT SUM(monto) as total, COUNT(*) as cantidad
            FROM ingresos
            WHERE usuario_id = %s {filtro_mes}
        """
        cursor.execute(query_ingresos, params_ingresos)
        row_ingresos = cursor.fetchone()
        total_ingresos = float(row_ingresos[0] or 0)
        cant_ingresos = row_ingresos[1] or 0

        # Total gastos
        total_gastos = sum(float(r[1]) for r in gastos_por_cat)
        balance = total_ingresos - total_gastos
        tasa_ahorro = (balance / total_ingresos * 100) if total_ingresos > 0 else 0

        # Presupuestos activos
        cursor.execute("""
            SELECT categoria, monto_limite
            FROM presupuestos
            WHERE usuario_id = %s AND activo = TRUE
        """, [usuario_id])
        presupuestos = cursor.fetchall()

        # Armar contexto como texto
        lineas = [
            f"=== RESUMEN FINANCIERO DEL USUARIO (período: {periodo}) ===",
            f"Ingresos totales: ${total_ingresos:,.2f} ({cant_ingresos} registros)",
            f"Gastos totales: ${total_gastos:,.2f}",
            f"Balance: ${balance:,.2f}",
            f"Tasa de ahorro: {tasa_ahorro:.1f}%",
            "",
            "Gastos por categoría:",
        ]
        for cat, total, cant in gastos_por_cat:
            lineas.append(f"  - {cat}: ${float(total):,.2f} ({cant} transacciones)")

        if presupuestos:
            lineas.append("")
            lineas.append("Presupuestos activos:")
            for cat, limite in presupuestos:
                # Calcular gasto vs límite
                gasto_cat = next((float(r[1]) for r in gastos_por_cat if r[0] == cat), 0)
                porcentaje = (gasto_cat / float(limite) * 100) if limite else 0
                lineas.append(f"  - {cat}: ${gasto_cat:,.2f} / ${float(limite):,.2f} ({porcentaje:.0f}%)")

        return "\n".join(lineas)

    except Exception as e:
        logger.error(f"Error obteniendo contexto financiero: {e}")
        return "No se pudo obtener el contexto financiero del usuario."
    finally:
        cursor.close()
        release_connection(conn)


# ─── Endpoint principal ───

@router.post("/")
def consultar_asistente(
    body: PreguntaAsistente,
    current_user: dict = Depends(get_current_user)
):
    """
    Recibe una pregunta del usuario y responde usando Claude (Anthropic API)
    con contexto de sus datos financieros reales.
    Solo disponible para usuarios premium.
    """
    # Verificar plan premium
    if current_user.get("plan") != "premium":
        raise HTTPException(
            status_code=403,
            detail="El Asistente IA está disponible solo para usuarios Premium."
        )

    # Validar pregunta
    pregunta = body.pregunta.strip()
    if not pregunta:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")
    if len(pregunta) > 500:
        raise HTTPException(status_code=400, detail="La pregunta no puede superar los 500 caracteres.")

    # Obtener API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY no configurada")
        raise HTTPException(status_code=500, detail="Asistente no configurado.")

    # Obtener contexto financiero del usuario
    contexto = obtener_contexto_financiero(current_user["id"], body.mes, body.anio)

    # Llamar a Anthropic API
    try:
        client = anthropic.Anthropic(api_key=api_key)

        system_prompt = (
            "Sos un asistente financiero personal inteligente y empático. "
            "Tu rol es ayudar al usuario a entender y mejorar sus finanzas personales. "
            "Respondés en español argentino, de forma clara, concisa y útil. "
            "Usás los datos financieros reales del usuario para dar consejos personalizados. "
            "Nunca inventás datos — si no tenés información suficiente, lo decís claramente. "
            "Tus respuestas son máximo 3 párrafos cortos."
        )

        mensaje = f"{contexto}\n\n=== PREGUNTA DEL USUARIO ===\n{pregunta}"

        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=600,
            system=system_prompt,
            messages=[
                {"role": "user", "content": mensaje}
            ]
        )

        respuesta = response.content[0].text
        return {
            "respuesta": respuesta,
            "tokens_usados": response.usage.input_tokens + response.usage.output_tokens
        }

    except anthropic.APIError as e:
        logger.error(f"Error Anthropic API: {e}")
        raise HTTPException(status_code=502, detail="Error al conectar con el asistente IA.")
    except Exception as e:
        logger.error(f"Error inesperado en asistente: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")