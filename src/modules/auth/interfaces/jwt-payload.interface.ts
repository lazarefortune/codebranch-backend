export interface JwtPayload {
  sub: string; // user id
  email: string;
  type: 'access' | 'refresh';
}

export interface JwtPayloadWithIat extends JwtPayload {
  iat: number;
  exp: number;
}
