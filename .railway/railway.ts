// Generado con `railway config migrate --apply` a partir de railway.toml.
// Esta configuración está aplicada y en uso desde el 21 de noviembre de 2026.
// Se aplica con `railway config apply`. Diferencias respecto de railway.toml:
//  - Se quitó `commitSha` (fijaba el commit viejo 1fce96a) para que el servicio
//    siga la rama `main` y no despliegue siempre ese commit.
import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "finanzas-dashboard";
export default defineRailway(() => {
  const finanzasDashboard = service("finanzas-dashboard", {
    source: github("GustavoRodriguez79/finanzas-dashboard", { branch: "main", rootDirectory: "backend", upstreamUrl: "https://github.com/GustavoRodriguez79/finanzas-dashboard" }),
    build: { buildEnvironment: "V3", builder: "NIXPACKS" },
    start: "uvicorn main:app --host 0.0.0.0 --port $PORT",
    healthcheck: "/",
    healthcheckTimeout: 100,
    replicas: { "iad": 1 },
  });

  return project("wonderful-freedom", {
    variables: { managed: false },
    resources: [finanzasDashboard],
  });
});
