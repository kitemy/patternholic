module.exports = (req, res) => {
  res.setHeader('Content-Type','application/json');
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `session=; HttpOnly; ${secure?'Secure; ':''}SameSite=Lax; Path=/; Max-Age=0`);
  res.json({ok:true});
};
