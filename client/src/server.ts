import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const NESTJS_PORT = 3000;
const DEFAULT_PORT = 4000;
const INTERNAL_SERVER_ERROR = 500;

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Proxy API requests to NestJS server
 */
app.use('/api', (req, res) => {
  const nestjsUrl = `http://localhost:${NESTJS_PORT}${req.url}`;

  // Forward the request to NestJS server
  fetch(nestjsUrl, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body:
      req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
  })
    .then(async (response) => {
      // Set response headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Set status code
      res.status(response.status);

      // Send response body
      const body = await response.text();
      res.send(body);
    })
    .catch((error) => {
      console.error('Proxy error:', error);
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ error: 'Internal server error' });
    });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next()
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || DEFAULT_PORT;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
