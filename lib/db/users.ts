import { UsersModel } from "@/actions/users/users.model";
import { type User, type NewUser } from "./schema";
import { UserWithProducts } from "@/actions/users/users.types";

export type { User, NewUser, UserWithProducts };

export const getOrCreateUser = UsersModel.getOrCreateUser;
export const getUserByEmail = UsersModel.getUserByEmail;
export const updateUser = UsersModel.updateUser;
export const getAllUsersWithProducts = UsersModel.getAllUsersWithProducts;
