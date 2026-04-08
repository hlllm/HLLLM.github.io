const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;
// 数据库连接（你的密码）
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Sun040117',
  database: 'lulu_toys',
  charset: 'utf8mb4'
});
pool.getConnection()
  .then(connection => {
    console.log('数据库连接成功');
    connection.release();
  })
  .catch(error => {
    console.error('数据库连接失败:', error);
  });

// 图片上传用（本地文件存储）
const imgUpload = multer({ dest: 'uploads/' });
// 批量导入CSV用（内存模式，不报错）
const csvUpload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'self'"
  );
  next();
});

// 登录接口
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE username=? AND password=?',
      [username, password]
    );
    res.json({ success: rows.length > 0 });
  } catch (e) {
    res.json({ success: false });
  }
});

// 获取商品列表（前端显示用）
app.get('/api/products', async (req, res) => {
  const search = req.query.search || '';
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE name LIKE ? OR code LIKE ?',
      [`%${search}%`, `%${search}%`]
    );
    res.json(rows);  // ✅ 正确返回数据
  } catch (e) {
    console.error('查询失败：', e);
    res.status(500).json([]);  // ✅ 明确返回错误
  }
});


// 添加商品（带图片上传）
app.post('/api/products', imgUpload.single('image'), async (req, res) => {
  try {
    const { name, code, price, image_url, description } = req.body;
    let img = image_url || '';
    if (req.file) {
      img = '/uploads/' + req.file.filename;
    }

    await pool.query(
      'INSERT INTO products (name, code, price, image_url, description) VALUES (?,?,?,?,?)',
      [name, code, price, img, description]
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// 修改商品
app.put('/api/products/:id', imgUpload.single('image'), async (req, res) => {
  try {
    const { name, code, price, image_url, description } = req.body;
    let img = image_url || '';
    if (req.file) {
      img = '/uploads/' + req.file.filename;
    }

    await pool.query(
      'UPDATE products SET name=?, code=?, price=?, image_url=?, description=? WHERE id=?',
      [name, code, price, img, description, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// 删除商品
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// ====================== ✅ 批量导入（终极修复，绝不报错） ======================
app.post('/api/products/import', csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.json({ success: false, msg: '未获取到文件' });
    }

    const csvStr = req.file.buffer.toString('utf8');
    const lines = csvStr.split('\n');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [name, code, price, image_url, description] = line.split(',');
      if (!name || !code) continue;

      await pool.query(
        'INSERT INTO products (name, code, price, image_url, description) VALUES (?,?,?,?,?)',
        [name.trim(), code.trim(), parseFloat(price) || 0, image_url?.trim() || '', description?.trim() || '']
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.log('批量导入错误：', err);
    res.json({ success: false });
  }
});

// 启动服务
app.listen(port, () => {
  console.log('服务已启动 → http://localhost:3001/index.html');
});