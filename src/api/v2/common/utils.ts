export function countUtf8Bytes( s ) {
  var b = 0, i = 0, c;
  for ( ; c = s.charCodeAt( i++ ); b += c >> 11 ? 3 : c >> 7 ? 2 : 1 );
  return b
}