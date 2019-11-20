const express = require( 'express' );
const router = express.Router();
const fs = require( 'fs' );
const request = require( 'request-promise-native' );
const parseString = require( 'xml2js' ).parseString;

const auth = JSON.parse( fs.readFileSync( './config/auth.json' ) );
const appId = auth.appId;
const authNAuth = auth.authNAuth;

router.get( '/search', ( req, res ) => {
  console.log( req.query );

  var filterIndex = 0;

  var searchUrl = 'https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD=true'
  searchUrl += '&SECURITY-APPNAME=' + appId;
  searchUrl += '&paginationInput.entriesPerPage=20';

  // ====================================================================================
  // Pagination
  // ====================================================================================
  if ( req.query.query != undefined ) {
    searchUrl += '&keywords=' + req.query.query;
  }

  // ====================================================================================
  // Pagination
  // ====================================================================================
  if ( req.query.page != undefined && Number.isInteger( +req.query.page ) && +req.query.page > 1 ) {
    searchUrl += '&paginationInput.pageNumber=' + req.query.page;
  }

  // ====================================================================================
  // Sorting
  // ====================================================================================
  const validSortings = new Map( [
    [ 1, 'EndTimeSoonest' ],
    [ 2, 'StartTimeNewest' ],
    [ 3, 'PricePlusShippingLowest' ],
    [ 4, 'PricePlusShippingHighest' ]
  ] );

  if ( req.query.sortBy != undefined && validSortings.has( +req.query.sortBy ) ) {
    searchUrl += '&sortOrder=' + validSortings.get( +req.query.sortBy );
  }

  // ====================================================================================
  // Category
  // ====================================================================================

  if ( req.query.category != undefined ) {
    searchUrl += '&categoryId=' + req.query.category;
  }

  // ====================================================================================
  // Filtering -- Listing Type
  // ====================================================================================

  if ( req.query.listType != undefined ) {
    if ( req.query.listType === '1' ) {
      searchUrl += `&itemFilter(${filterIndex}).name=ListingType`;
      searchUrl += `&itemFilter(${filterIndex}).value(0)=AuctionWithBIN`;
      searchUrl += `&itemFilter(${filterIndex}).value(1)=FixedPrice`;
      searchUrl += `&itemFilter(${filterIndex}).value(2)=StoreInventory`;
      filterIndex++;
    } else if ( req.query.listType === '2' ) {
      searchUrl += `&itemFilter(${filterIndex}).name=BestOfferOnly`;
      searchUrl += `&itemFilter(${filterIndex}).value(0)=true`;
      filterIndex++;
    } else if ( req.query.listType === '3' ) {
      searchUrl += `&itemFilter(${filterIndex}).name=ListingType`;
      searchUrl += `&itemFilter(${filterIndex}).value(0)=AuctionWithBIN`;
      searchUrl += `&itemFilter(${filterIndex}).value(1)=Auction`;
      filterIndex++;
    }
  }

  // ====================================================================================
  // Filtering -- Condition
  // ====================================================================================

  if ( req.query.condition != undefined ) {
    searchUrl += `&itemFilter(${filterIndex}).name=Condition`
    searchUrl += `&itemFilter(${filterIndex}).value(0)=${req.query.condition}`
  }

  request( searchUrl, { json: true } ).then( response => {
    res.json( response.findItemsAdvancedResponse[ 0 ] );
  } ).catch( error => {
    res.send( error );
  } );
} );

router.get( '/item/:id', ( req, res ) => {
  var url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem'
  url += '&responseencoding=JSON&siteid=0&version=967';
  url += '&appid=' + appId;
  url += '&ItemID=' + req.params.id;

  request( url, { json: true } ).then( response => {
    res.json( response.Item );
  } ).catch( error => {
    res.send( error );
  } );
} );

router.get( '/item/:id/description', ( req, res ) => {
  var url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem'
  url += '&responseencoding=JSON&siteid=0&version=967';
  url += '&appid=' + appId;
  url += '&ItemID=' + req.params.id;
  url += '&IncludeSelector=Description';

  request( url, { json: true } ).then( response => {
    res.json( response.Item );
  } ).catch( error => {
    res.send( error );
  } );
} );

router.get( '/category', ( req, res ) => {
  var options = {
    method: 'POST',
    url: 'https://api.ebay.com/ws/api.dll',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetCategories',
    },
    body: `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${authNAuth}</eBayAuthToken>
      </RequesterCredentials>
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <CategorySiteID>0</CategorySiteID>
      <DetailLevel>ReturnAll</DetailLevel>
      <LevelLimit>1</LevelLimit>
    </GetCategoriesRequest>
    `,
  }
  request( options ).then( response => {
    parseString( response, ( err, result ) => {
      delete result.GetCategoriesResponse[ '$' ];
      res.json( result.GetCategoriesResponse );
    } );
  } ).catch( err => {
    console.error( err );
  } );
} );

router.get( '/category/:categoryID', ( req, res ) => {
  var options = {
    method: 'POST',
    url: 'https://api.ebay.com/ws/api.dll',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetCategories',
    },
    body: `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${authNAuth}</eBayAuthToken>
      </RequesterCredentials>
      <CategoryParent>${req.params.categoryID}</CategoryParent>
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <CategorySiteID>0</CategorySiteID>
      <DetailLevel>ReturnAll</DetailLevel>
      <LevelLimit>1</LevelLimit>
    </GetCategoriesRequest>
    `,
  }
  request( options ).then( response => {
    parseString( response, ( err, result ) => {
      delete result.GetCategoriesResponse[ '$' ];
      res.json( result.GetCategoriesResponse );
    } );
  } ).catch( err => {
    console.error( err );
  } );
} );

router.get( '/category/:categoryID/condition/', ( req, res ) => {
  var options = {
    method: 'POST',
    url: 'https://api.ebay.com/ws/api.dll',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetCategoryFeatures',
    },
    body: `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoryFeaturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${authNAuth}</eBayAuthToken>
      </RequesterCredentials>
      <DetailLevel>ReturnAll</DetailLevel>
      <LevelLimit>1</LevelLimit>
      <ViewAllNodes>true</ViewAllNodes>
      <CategoryID>${req.params.categoryID}</CategoryID>
      <FeatureID>ConditionValues</FeatureID>
    </GetCategoryFeaturesRequest>
    `,
  }
  request( options ).then( response => {
    parseString( response, ( err, result ) => {
      delete result.GetCategoryFeaturesResponse[ '$' ];
      res.json( result.GetCategoryFeaturesResponse );
    } );
  } ).catch( err => {
    console.error( err );
  } );
} );

module.exports = router;