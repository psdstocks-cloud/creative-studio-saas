import express from 'express';
import { buildUpstreamUrl, streamProxy } from '../lib/proxy.js';

const stockinfoRouter = express.Router();

stockinfoRouter.get('/:site/:id', async (req, res) => {
  try {
    const url = buildUpstreamUrl(
      `stockinfo/${encodeURIComponent(req.params.site)}/${encodeURIComponent(req.params.id)}`,
      req.query,
    );

    await streamProxy({ url, method: 'GET', req, res });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 502;
    res.status(status).json({ message: 'Upstream error' });
  }
});

stockinfoRouter.all('/*', async (req, res) => {
  try {
    const tail = req.params[0] || '';
    const normalizedTail = tail.replace(/^\//, '');
    const resourcePath = normalizedTail ? `stockinfo/${normalizedTail}` : 'stockinfo';
    const url = buildUpstreamUrl(resourcePath, req.query);

    await streamProxy({ url, method: req.method, req, res });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 502;
    res.status(status).json({ message: 'Upstream error' });
  }
});

export { stockinfoRouter };
