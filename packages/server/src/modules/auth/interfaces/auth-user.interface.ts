export interface AuthUser {
  id: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  /**
   * Tokens minted before this claim existed omit it, so it is read as false
   * rather than blocking sessions issued by an older build.
   */
  mustChangePassword: boolean;
}
