const express = require( 'express' );
const cors = require( 'cors' );

const app = express();

app.use( cors() );

app.use( '/api', require( './api' ) );

app.get( '/', ( req, res ) => res.send( 'Copyright Alex Zhao 2019' ) );

module.exports = app;