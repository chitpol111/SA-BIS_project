let app

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = url.searchParams.get('__path')
  if (path) {
    if (!path.startsWith('/api/')) {
      res.statusCode = 400
      return res.end('Invalid API path')
    }
    url.searchParams.delete('__path')
    req.url = path + url.search
  }
  app ??= import('../server/index.js').then((module) => module.default)
  return (await app)(req, res)
}
