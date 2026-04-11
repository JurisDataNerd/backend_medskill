import jwt from 'jsonwebtoken';

// Compare password (tidak dipakai lagi karena menggunakan Supabase Auth)
// Password handling dilakukan oleh Supabase Auth

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      token_balance: user.token_balance
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};
