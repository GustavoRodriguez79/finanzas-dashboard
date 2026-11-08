// AuthContextValue.js
// Objeto de contexto de autenticación, en su propio archivo para que
// AuthContext.jsx exporte solo el componente AuthProvider (regla
// react-refresh/only-export-components: un archivo de componentes no debe
// exportar además valores que no sean componentes).

import { createContext } from "react";

// Valor inicial null: useAuth lo detecta y avisa si se usa fuera de AuthProvider
export const AuthContext = createContext(null);
