const fs = require( 'fs' );
const request = require( 'request-promise-native' );
const parser = require( 'xml2js' ).Parser( { 'explicitArray': false } ).parseString;
const auth = JSON.parse( fs.readFileSync( './auth.json' ) );
const appId = auth.appId;
const config = JSON.parse( fs.readFileSync( './api/v2/config/config.json' ) );
const version = config.version;

module.exports.getItem = ( req, res ) => {
  let url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem'
  url += '&responseencoding=XML&siteid=0&version=967';
  url += '&appid=' + appId;
  url += '&ItemID=' + req.params.id;


  request( url, { json: true } ).then( response => {

    parser( response, ( err, result ) => {
      result = result.GetSingleItemResponse;
      delete result[ '$' ];
      // fs.writeFileSync( './dummy-data/item.json', JSON.stringify( result ) );
      res.json( result );
    } );
  } ).catch( error => {
    res.send( error );
  } );
}

module.exports.getItemDescription = ( req, res ) => {
  let url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem'
  url += '&responseencoding=XML&siteid=0&version=967';
  url += '&appid=' + appId;
  url += '&ItemID=' + req.params.id;
  url += '&IncludeSelector=Description';

  request( url, { json: true } ).then( response => {
    parser( response, ( err, result ) => {
      result = result.GetSingleItemResponse;
      delete result[ '$' ];
      res.json( result );
    } );
  } ).catch( error => {
    res.send( error );
  } );
}