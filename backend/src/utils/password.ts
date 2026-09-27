const bcrypt = require('bcryptjs');

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hashSync(password, 12);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compareSync(password, hash);
};
