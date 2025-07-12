const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// ✅ Serve static files from /public (css, js, html, images)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Category API route
app.get('/api/category/:slug', async (req, res) => {
  const { slug } = req.params;
  const url = `https://world.openfoodfacts.org/category/${encodeURIComponent(slug)}.json`;

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'ScanalyzeApp/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to fetch category data' });
  }
});

// ✅ Search API route
app.get('/api/search', async (req, res) => {
  const searchTerms = req.query.q || '';
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerms)}&search_simple=1&action=process&json=1`;

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'ScanalyzeApp/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// ✅ Product details API route
app.get('/api/product/:code', async (req, res) => {
  const { code } = req.params;
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'ScanalyzeApp/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to fetch product data' });
  }
});

// ✅ Optional: Serve login.html directly via route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});

// ✅ Optional: Serve home-page.html directly via route
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'home-page.html'));
});

// ✅ Fallback: Default route to login page (optional)
app.get('/', (req, res) => {
  res.redirect('/html/login.html');
});

// ✅ 404 fallback
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
