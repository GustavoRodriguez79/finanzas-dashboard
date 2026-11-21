// EstadoVacio.jsx
// Mensaje motivador que se muestra cuando una página no tiene datos.
// El ícono y el botón son opcionales: el ícono solo se dibuja si se pasa `icono`, el botón
// solo si se pasan textoBoton y onClick.

import "./EstadoVacio.css";

function EstadoVacio({ icono, texto, textoBoton, onClick }) {
  return (
    <div className="estado-vacio">
      {icono && <span className="estado-vacio-icono" aria-hidden="true">{icono}</span>}
      <p className="estado-vacio-texto">{texto}</p>
      {textoBoton && onClick && (
        <button className="estado-vacio-boton" onClick={onClick}>
          {textoBoton}
        </button>
      )}
    </div>
  );
}

export default EstadoVacio;
