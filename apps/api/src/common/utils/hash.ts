import bcrypt from 'bcryptjs';

export const hashValue = async (value: string): Promise<string> => bcrypt.hash(value, 10);
export const matchesHash = async (value: string, hash: string): Promise<boolean> =>
  bcrypt.compare(value, hash);

