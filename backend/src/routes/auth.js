import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    // Email may exist in multiple tenants; demo login uses unique seeded emails.
    const result = await pool.query(
      `SELECT id, tenant_id, name, email, password_hash, role
       FROM users WHERE email = $1 LIMIT 1`, [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { tenant_id: user.tenant_id, role: user.role },
      process.env.JWT_SECRET,
      { subject: user.id, expiresIn: '4h' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenant_id }
    });
  } catch (error) { next(error); }
});
export default router;
