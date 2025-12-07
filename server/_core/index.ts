import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // CV View endpoint - wyświetlanie CV z możliwością edycji
  app.get("/cv/:id", async (req, res) => {
    try {
      const cvId = parseInt(req.params.id);
      if (!cvId || isNaN(cvId)) {
        return res.status(400).send("Invalid CV ID");
      }
      
      const { getCVHistoryById } = await import("../db");
      const history = await getCVHistoryById(cvId);
      
      if (!history) {
        return res.status(404).send("CV not found");
      }
      
      // HTML z możliwością edycji
      const editableHTML = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - Edycja</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1f2937;
      color: white;
      padding: 12px 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .toolbar button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .toolbar button:hover {
      background: #2563eb;
    }
    .toolbar .edit-mode {
      background: #10b981;
    }
    .toolbar .edit-mode:hover {
      background: #059669;
    }
    .content {
      margin-top: 60px;
      padding: 20px;
    }
    .editable {
      outline: 2px dashed #3b82f6;
      outline-offset: 2px;
      min-height: 20px;
    }
    .editable:focus {
      outline: 2px solid #3b82f6;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="toggleEditMode()" id="editBtn">Tryb edycji</button>
    <button onclick="printCV()">Drukuj</button>
    <button onclick="downloadCV()">Pobierz HTML</button>
    <span style="margin-left: auto; font-size: 12px; opacity: 0.8;">CV ID: ${cvId}</span>
  </div>
  <div class="content" id="cvContent">
    ${history.htmlContent}
  </div>
  <script>
    let editMode = false;
    
    function toggleEditMode() {
      editMode = !editMode;
      const btn = document.getElementById('editBtn');
      const content = document.getElementById('cvContent');
      
      if (editMode) {
        btn.textContent = 'Zakończ edycję';
        btn.classList.add('edit-mode');
        content.contentEditable = 'true';
        content.style.outline = '2px dashed #3b82f6';
        content.style.outlineOffset = '2px';
      } else {
        btn.textContent = 'Tryb edycji';
        btn.classList.remove('edit-mode');
        content.contentEditable = 'false';
        content.style.outline = 'none';
      }
    }
    
    function printCV() {
      window.print();
    }
    
    function downloadCV() {
      const content = document.getElementById('cvContent').innerHTML;
      const fullHTML = \`<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV</title>
</head>
<body>
  \${content}
</body>
</html>\`;
      
      const blob = new Blob([fullHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`CV_\${new Date().toISOString().split('T')[0]}.html\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
      
      res.send(editableHTML);
    } catch (error: any) {
      console.error('[CV View] Error:', error);
      res.status(500).send("Error loading CV");
    }
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
