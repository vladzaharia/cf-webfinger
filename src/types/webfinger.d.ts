/**
 * Full webfinger response
 */
export interface WebfingerResponse {
  /**
   * The subject of the webfinger response, in the format `acct:username@domain`
   */
  subject: string;

  /**
   * Aliases to include in the webfinger response
   */
  aliases?: string[];

  /**
   * Links to include in the webfinger response
   */
  links?: WebfingerLink[];

  /**
   * Properties to include in the webfinger response
   */
  properties?: Record<string, string>;
}

/**
 * A single link in a webfinger response
 */
export interface WebfingerLink {
  /**
   * The type of link, such as `http://openid.net/specs/connect/1.0/issuer`
   */
  rel: string;

  /**
   * The type of the link, such as `image/jpeg`
   */
  type?: string;

  /**
   * The value of the link, as a string
   */
  href?: string;

  /**
   * The titles of the link, as an object of language code (or `und`) to title
   */
  titles?: Record<string, string>;

  /**
   * The properties of the link, as an object of property name to value
   */
  properties?: Record<string, string>;
}
