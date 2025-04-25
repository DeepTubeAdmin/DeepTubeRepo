import { User } from "../schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}