import request from 'request-promise-native';
import xml2js from 'xml2js';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseString;
const appId = process.env.APP_ID;
const authNAuth = process.env.AUTH_N_AUTH;

module.exports.getItem = ( req, res ) => {
  try {
    let options = {
      method: 'POST',
      url: 'https://api.ebay.com/ws/api.dll',
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetItem',
      },
      body: `
    <?xml version="1.0" encoding="utf-8"?>
    <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${authNAuth}</eBayAuthToken>
      </RequesterCredentials>
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <DetailLevel>ItemReturnAttributes</DetailLevel>
      <ItemID>${req.params.id}</ItemID>
      <IncludeWatchCount>true</IncludeWatchCount>
    </GetItemRequest>
    `,
    }
    request( options ).then( response => {
      parser( response, ( err, result ) => {
        delete result.GetItemResponse[ '$' ];
        res.json( result.GetItemResponse );
        console.log( result );
      } );
    } );
  } catch ( error ) {
    console.log( error );
    res.sendStatus( 500 );
  }
}

module.exports.getItemPictures = ( req, res ) => {
  try {
    let url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem'
    url += '&responseencoding=XML&siteid=0&version=967';
    url += '&appid=' + appId;
    url += '&ItemID=' + req.params.id;

    request( url ).then( response => {
      parser( response, ( err, result ) => {
        res.status( 200 ).json( result.GetSingleItemResponse.Item.PictureURL );
      } );
    } );
  } catch ( error ) {
    console.error( error );
    res.sendStatus( 500 );
  }
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