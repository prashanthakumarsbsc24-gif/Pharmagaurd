const HttpError = require('../utils/httpError');

const notFound = (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(' ');
    return res.status(400).json({ error: message });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid identifier.' });
  if (err.code === 11000) return res.status(409).json({ error: 'That record already exists.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The upload is too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });

  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
};

module.exports = { notFound, errorHandler };
