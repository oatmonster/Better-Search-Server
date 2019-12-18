import express from 'express';
import request from 'request-promise-native';
import xml2js from 'xml2js';
import * as search from './controllers/search';
import * as items from './controllers/items';
import * as categories from './controllers/categories';
import { countUtf8Bytes } from './common/utils';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const router = express.Router();
const ipApiKey = process.env.IP_API_KEY;
const appId = process.env.APP_ID;

router.get( '/search', search.search );
router.get( '/items/:id', items.getItem );
router.get( '/items/:id/pictures', items.getItemPictures );
router.get( '/items/:id/description', items.getItemDescription );
router.get( '/categories/:categoryId/children', categories.getChildren );
router.get( '/categories/:categoryId/parents', categories.getParents );
router.get( '/categories/:categoryId/siblings', categories.getSiblings );
router.get( '/categories', categories.getAll );
router.get( '/categories/:categoryId', categories.getCategory );
router.get( '/categories/:categoryId/conditions', categories.getCategoryConditions );

router.get( '/time', ( req, res ) => {
  console.log( 'REQUEST Get time' );
  let body = `
    <?xml version="1.0" encoding="utf-8"?>
    <GeteBayTimeRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    </GeteBayTimeRequest>
  `;
  let options = {
    method: 'POST',
    url: 'https://open.api.ebay.com/shopping',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': countUtf8Bytes( body ),
      'X-EBAY-API-APP-ID': appId,
      'X-EBAY-API-SITE-ID': '0',
      'X-EBAY-API-CALL-NAME': 'GeteBayTime',
      'X-EBAY-API-VERSION': '863',
      'X-EBAY-API-REQUEST-ENCODING': 'xml'
    },
    body: body,
  };
  let timeZone = 'America/Los_Angeles'
  request( `https://api.ipgeolocation.io/timezone?apiKey=${ipApiKey}&ip=${req.ip}` ).then( response => {
    timeZone = response.timezone;
    return request( options );
  } ).catch( error => {
    return request( options );
  } ).then( response => {
    return parser( response );
  } ).then( result => {
    let times = {
      ebayTime: result.GeteBayTimeResponse.Timestamp,
      timeZone: timeZone,
    };
    res.status( 200 ).json( times );
  } ).catch( error => {
    console.error( error );
    res.sendStatus( 500 );
  } );
} );

module.exports = router;