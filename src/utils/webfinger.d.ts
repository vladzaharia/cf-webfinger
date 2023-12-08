export interface WebfingerResponse {
  subject: string;
  links: WebfingerLink[];
}

export interface WebfingerLink {
  rel: string;
  href: string;
}
