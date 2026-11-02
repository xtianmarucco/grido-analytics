import path from 'node:path';

import express, { type RequestHandler, type Router } from 'express';

import { notFoundHandler } from './errors.js';

/**
 * Serves the built web app (`apps/web/dist`) from the API process so production is one origin.
 * Hashed files under `/assets` are cached for a year; `index.html` is always revalidated.
 * Any other GET/HEAD that accepts HTML and is not under `/api` gets `index.html` (SPA fallback).
 */
export function createStaticWebRouter(webDistDir: string): Router {
  const router = express.Router();

  router.use(
    '/assets',
    express.static(path.join(webDistDir, 'assets'), {
      immutable: true,
      maxAge: '1y',
    }),
  );
  // A missing hashed asset is a real 404, never the SPA page.
  router.use('/assets', notFoundHandler);
  router.use(express.static(webDistDir, { index: false }));
  router.use(spaFallback(webDistDir));

  return router;
}

function spaFallback(webDistDir: string): RequestHandler {
  return (req, res, next) => {
    const isPageRequest = req.method === 'GET' || req.method === 'HEAD';
    if (!isPageRequest || isApiPath(req.path) || !req.accepts('html')) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root: webDistDir }, (error) => {
      if (error) next(error);
    });
  };
}

function isApiPath(requestPath: string): boolean {
  return requestPath === '/api' || requestPath.startsWith('/api/');
}
