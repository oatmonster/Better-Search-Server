export function countUtf8Bytes( s ) {
  var b = 0, i = 0, c;
  for ( ; c = s.charCodeAt( i++ ); b += c >> 11 ? 3 : c >> 7 ? 2 : 1 );
  return b
}

export class HttpError extends Error {
  constructor( message: string, status: number ) {
    super( message );
    this.status = status;
    this.name = 'HttpError';
  }
  public status: number;

  public toString() {
    return 'ERROR ' + this.name + ' ' + this.status + ': ' + this.message;
  }
}