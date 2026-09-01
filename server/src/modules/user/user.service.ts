import User from "./user.model";
import type { IUserDocument, UserRole } from "./user.types";

export const sanitizeUser = (user: Partial<IUserDocument> | null) => {
  if (!user) {
    return null;
  }

  const safeUser = user.toObject ? user.toObject() : user;

  delete safeUser.password;

  return safeUser;
};

export const createUser = async (input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
}) => {
  const user = await User.create({
    ...input,
  });

  return sanitizeUser(user);
};

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email }).select("+password");
};

export const findUserById = async (userId: string) => {
  return User.findById(userId);
};
