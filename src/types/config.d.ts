/**
 * Config that can be overwritten per-domain
 */
interface OverwritableConfig {
  /**
   * OIDC configuration
   */
  oidc?: {
    /**
     * The issuer URL of the OIDC provider
     */
    issuer: string;
  };
}

/**
 * Full configuration object
 */
export interface Config extends OverwritableConfig {
  /**
   * Domains whitelisted for access, optionally with overwritable configuration
   */
  domains: {
    [key: string]: Partial<OverwritableConfig>;
  };

  /**
   * Users whitelisted for access, with optional profile information
   */
  users: {
    [key: string]: User;
  };
}

export interface User {
  /**
   * User's name
   */
  name?: string;

  /**
   * User's email address
   */
  email?: string;

  /**
   * User's website
   */
  website?: string;

  /**
   * User's profile picture
   */
  image?: string;

  /**
   * Other emails to use when requesting user information, in addition to `username@domain`
   */
  usernames?: string[];
}
