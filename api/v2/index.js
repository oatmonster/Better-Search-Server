const express = require( 'express' );
const router = express.Router();
const fs = require( 'fs' );
const request = require( 'request-promise-native' );
const parser = require( 'xml2js' ).Parser( { 'explicitArray': false } );

// const auth = JSON.parse( fs.readFileSync( 'auth.json' ) );
// const appId = auth.appId;
// const authNAuth = auth.authNAuth;

const API_VERSION = '2.0.0';

module.exports = router;