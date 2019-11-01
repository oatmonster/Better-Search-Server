const express = require( 'express' );
const api_helper = require( './API_helper' );
const cors = require( 'cors' );
const fs = require( 'fs' );
const appId = fs.readFileSync( './APP_ID', 'utf8' );

const lineReader = require( 'readline' ).createInterface( {
  input: fs.createReadStream( 'categories.txt' )
} );

var categoriesArray = []
var categoriesMap = new Map();

lineReader.on( 'line', function ( line ) {
  const [ id, ...others ] = line.split( ' ' );
  category = '';
  for ( var i = 0; i < others.length - 1; i++ ) category += others[ i ] + ' ';
  category += others[ others.length - 1 ];
  categoriesArray.push( {
    id: id,
    name: category
  } );
  categoriesMap.set( +id, category );
} );

var app = express();
app.use( cors() );

app.get( '/', ( req, res ) => res.send( 'Copyright Alex Zhao 2019' ) );

app.get( '/search', ( req, res ) => {
  console.log( req.query );

  var filterIndex = 0;

  var searchUrl = 'https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD=true'
  searchUrl += '&SECURITY-APPNAME=' + appId;
  searchUrl += '&keywords=' + req.query.query;
  searchUrl += '&paginationInput.entriesPerPage=20';

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

  if ( req.query.category != undefined && categoriesMap.has( +req.query.category ) ) {
    searchUrl += '&categoryId=' + req.query.category;
  }
  else {
    console.log( categoriesMap )
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

  console.log( searchUrl );

  api_helper.make_API_call( searchUrl ).then( response => {
    res.json( response.findItemsAdvancedResponse[ 0 ] );
  } ).catch( error => {
    res.send( error );
  } );
} );

app.get( '/item/:id', ( req, res ) => {
  var url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem&responseencoding=JSON&appid=' + appId + '&siteid=0&version=967&ItemID=' + req.params.id;

  api_helper.make_API_call( url ).then( response => {
    res.json( response.Item );
  } ).catch( error => {
    res.send( error );
  } );
} );

app.get( '/categories', ( req, res ) => {
  res.json( {
    ack: 'Success',
    categories: categoriesArray
  } );
} );

app.listen( process.env.PORT || 3000 )