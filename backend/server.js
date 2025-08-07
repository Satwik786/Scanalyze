const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const User = require('./models/User');
const connectDB = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// ✅ Import preferences route
const preferencesRoute = require('./routes/preferences');
app.use('/api/preferences', preferencesRoute);

// 📦 Category API route
app.get('/api/category/:slug', async (req, res) => {
  const { slug } = req.params;
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(slug)}&tagtype_1=countries&tag_contains_1=contains&tag_1=india&json=1`;

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'ScanalyzeApp/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Category API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch category data' });
  }
});

// 🔍 Search API route
app.get('/api/search', async (req, res) => {
  const searchTerms = req.query.q || '';
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerms)}&search_simple=1&action=process&json=1`;

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'ScanalyzeApp/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Search API error:', error.message);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

// 🧪 Product details API with preference check
app.get('/api/product/:code', async (req, res) => {
  const { code } = req.params;
  const identifier = req.query.identifier;
  const productUrl = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;

  try {
    const response = await axios.get(productUrl, {
      headers: { 'User-Agent': 'ScanalyzeApp/1.0' }
    });

    const product = response.data.product;

    let warnings = [];

    if (identifier) {
      const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }]
    });


      if (user && user.preferences && product.ingredients_text) {
        const productIngredients = product.ingredients_text.toLowerCase();
        user.preferences.forEach((pref) => {
          if (productIngredients.includes(pref.toLowerCase())) {
            warnings.push(pref);
          }
        });
      }
    }

    res.json({ product, warnings });
  } catch (error) {
    console.error('Product API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch product data' });
  }
});

// Serve login.html
app.get('/login', (req, res) => {
  res.redirect('/html/login.html');
});

// Serve home-page.html
app.get('/home', (req, res) => {
  res.redirect('/html/home-page.html');
});

// Fallback route
app.get('/', (req, res) => {
  res.redirect('/html/login.html');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
