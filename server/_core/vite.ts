import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";

export async function setupVite(app: Express, server: Server, port: number) {
  // Dynamiczny import vite.config tylko w development, aby uniknąć problemów z esbuild w produkcji
  const viteConfig = await import("../../vite.config");
  
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
    ...viteConfig.default,
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
  // W produkcji, po zbudowaniu przez esbuild, pliki są w dist/
  // W development, pliki źródłowe są w server/_core/
  // Używamy process.cwd() aby zawsze wskazywać na katalog główny projektu
  const projectRoot = process.cwd();
  const distPath = path.resolve(projectRoot, "dist", "public");
  
  console.log(`[serveStatic] Looking for build directory at: ${distPath}`);
  console.log(`[serveStatic] Current working directory: ${projectRoot}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `[serveStatic] ERROR: Could not find the build directory: ${distPath}`
    );
    console.error(
      `[serveStatic] Make sure to run 'pnpm build' to build the client first`
    );
    console.error(
      `[serveStatic] Expected structure: dist/public/index.html`
    );
    
    // Zwróć błąd zamiast kontynuować
    app.use("*", (_req, res) => {
      res.status(500).send(`
        <html>
          <head><title>Build Error</title></head>
          <body>
            <h1>Build Directory Not Found</h1>
            <p>The build directory was not found at: <code>${distPath}</code></p>
            <p>Please run <code>pnpm build</code> to build the client first.</p>
            <p>Current working directory: <code>${projectRoot}</code></p>
          </body>
        </html>
      `);
    });
    return;
  }
  
  const indexHtmlPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(
      `[serveStatic] ERROR: index.html not found at: ${indexHtmlPath}`
    );
    app.use("*", (_req, res) => {
      res.status(500).send(`
        <html>
          <head><title>Build Error</title></head>
          <body>
            <h1>index.html Not Found</h1>
            <p>The index.html file was not found at: <code>${indexHtmlPath}</code></p>
            <p>Please run <code>pnpm build</code> to build the client first.</p>
          </body>
        </html>
      `);
    });
    return;
  }
  
  console.log(`[serveStatic] Serving static files from: ${distPath}`);
  console.log(`[serveStatic] index.html found at: ${indexHtmlPath}`);

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(indexHtmlPath);
  });
}
