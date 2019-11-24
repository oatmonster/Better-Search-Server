const express = require( 'express' );
const router = express.Router();
const fs = require( 'fs' );
const request = require( 'request-promise-native' );
const auth = JSON.parse( fs.readFileSync( './auth.json' ) );
const ipApiKey = auth.ipApiKey;

const search = require( './controllers/search' );
const items = require( './controllers/items' );

router.get( '/search', search.search );
router.get( '/items/:id', items.getItem );
router.get( '/items/:id/pictures', items.getItemPictures );
router.get( '/items/:id/description', items.getItemDescription );

router.get( '/ip', ( req, res ) => {
  try {
    let url = `https://api.ipgeolocation.io/ipgeo?apiKey=${ipApiKey}&ip=${req.ip}`;

    request( url, { json: true } ).then( response => {
      res.json( {
        ip: response.ip,
        zipCode: response.zipcode
      } );
    } ).catch( error => {
      res.json( {
        ip: req.ip,
        zipCode: '98177'
      } );
    } );
  } catch ( error ) {
    console.error( error );
    res.sendStatus( 500 );
  }

} );

module.exports = router;