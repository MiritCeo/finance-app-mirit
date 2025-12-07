import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server, port: number) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { 
      server,
      port: port,
      clientPort: port,
    },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Vite middleware obsługuje wszystkie żądania do zasobów statycznych i modułów
  // Musi być przed catch-all route
  app.use((req, res, next) => {
    // Debug: loguj żądania do plików źródłowych
    if (req.url?.startsWith("/src/")) {
      console.log(`[Vite] Request to: ${req.url}`);
    }
    vite.middlewares(req, res, next);
  });
  
  // Catch-all route - tylko dla żądań HTML (routy aplikacji)
  // Vite middleware obsługuje wszystkie żądania do /src/, /node_modules/, /@vite/, itp.
  // Ten route jest wywoływany tylko jeśli Vite middleware nie obsłużył żądania
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Pomiń tylko żądania do API i CV - te są obsługiwane przez inne route'y
    // NIE pomijamy /src/ - Vite middleware powinien to obsłużyć, ale jeśli nie,
    // to nie chcemy zwracać HTML dla plików źródłowych
    if (
      url.startsWith("/api/") ||
      url.startsWith("/cv/")
    ) {
      return next();
    }
    
    // Jeśli to żądanie do pliku (ma rozszerzenie), nie zwracaj HTML
    if (url.match(/\.(js|ts|tsx|jsx|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
