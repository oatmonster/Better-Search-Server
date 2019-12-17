import request from 'request-promise-native';
import xml2js from 'xml2js';
import { IItem, ISearchResult, ICondition, ICategory } from '../common/interfaces';
import { HttpError } from '../common/utils';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const appId = process.env.APP_ID;
const ipApiKey = process.env.IP_API_KEY;

function search( req, res ) {
  console.log( 'REQUEST Search query ' + JSON.stringify( req.query ) );
  console.time( 'REQUEST Search query ' + JSON.stringify( req.query ) );
  buildSearchUrl( req ).then( url => {
    return request.get( url );
  } ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.findItemsAdvancedResponse.ack !== 'Success' ) {
      // TODO: Check ebay error message to find cause of failure 
      throw new HttpError( 'Failed to get item info', 400 );
    }
    res.status( 200 ).json( cleanSearchResponse( result.findItemsAdvancedResponse ) );
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } ).finally( () => {
    console.timeEnd( 'REQUEST Search query ' + JSON.stringify( req.query ) );
  } );
}

function cleanSearchResponse( dirty ): ISearchResult {
  let clean: ISearchResult = {
    searchResult: {
      count: dirty.searchResult[ '$' ].count,
      items: []
    },
    pagination: {
      page: +dirty.paginationOutput.pageNumber,
      totalPages: +dirty.paginationOutput.totalPages,
      totalEntries: +dirty.paginationOutput.totalEntries,
      entriesPerPage: +dirty.paginationOutput.entriesPerPage,
    },
    searchEbayUrl: dirty.itemSearchURL,
    aspectHistogram: undefined,
    categoryHistogram: undefined,
  };
  let items = [].concat( dirty.searchResult.item || [] );
  clean.searchResult.items = items.map( item => {
    let cleanItem: IItem = {
      itemId: item.itemId,
      title: item.title,
      thumbnailUrl: item.pictureURLLarge ||
        item.galleryURL ||
        'https://thumbs1.ebaystatic.com/pict/04040_0.jpg',
      country: item.country,
      listingInfo: {
        startTimeUtc: item.listingInfo.startTime,
        endTimeUtc: item.listingInfo.endTime,
        timeRemaining: item.sellingStatus.timeLeft,
      },
      listingType: undefined,
      bestOfferEnabled: item.listingInfo.bestOfferEnabled === 'true',
      buyItNowEnabled: item.listingInfo.buyItNowAvailable === 'true',
      currentPrice: {
        price: +item.sellingStatus.currentPrice[ '_' ],
        currencyId: item.sellingStatus.currentPrice[ '$' ].currencyId
      },
      currentPriceConverted: {
        price: +item.sellingStatus.convertedCurrentPrice[ '_' ],
        currencyId: item.sellingStatus.convertedCurrentPrice[ '$' ].currencyId
      },
      sellingState: item.sellingStatus.sellingState,
      watchCount: +item.listingInfo.watchCount,
      shippingInfo: {
        type: item.shippingInfo.shippingType,
        cost: +item.shippingInfo.shippingServiceCost[ '_' ],
        currencyId: item.shippingInfo.shippingServiceCost[ '$' ].currencyId
      },
      category: {
        id: item.primaryCategory.categoryId,
        name: item.primaryCategory.categoryName,
      },
      itemEbayUrl: item.viewItemURL,
    };

    if ( item.hasOwnProperty( 'condition' ) ) {
      cleanItem.condition = {
        id: item.condition.conditionId,
        name: item.condition.conditionDisplayName
      };
    }

    // Normalize listing type
    if ( item.listingInfo.listingType === 'AdType' || item.listingInfo.listingType === 'Classified' ) {
      cleanItem.listingType = 'Advertisement';
    } else if ( item.listingInfo.listingType === 'Auction' || item.listingInfo.listingType === 'AuctionWithBIN' || item.listingInfo.listingType === 'FixedPrice' ) {
      cleanItem.listingType = item.listingInfo.listingType;
    } else if ( item.listingInfo.listingType === 'StoreInventory' ) {
      cleanItem.listingType = 'FixedPrice';
    } else {
      cleanItem.listingType = 'OtherType';
    }

    if ( cleanItem.listingType === 'Auction' || cleanItem.listingType === 'AuctionWithBIN' ) {
      cleanItem.bidCount = +item.sellingStatus.bidCount;
    }

    return cleanItem;
  } );

  // Aspect Histogram
  if ( dirty.aspectHistogramContainer.aspect !== undefined ) {
    clean.aspectHistogram = [].concat( dirty.aspectHistogramContainer.aspect ).map( aspect => {
      let values = [].concat( aspect.valueHistogram ).map( value => {
        return {
          name: value[ '$' ][ 'valueName' ],
          count: +value[ 'count' ],
        };
      } );
      return {
        aspect: aspect[ '$' ][ 'name' ],
        values: values,
      };
    } );
  }

  // Category Histogram
  if ( dirty.categoryHistogramContainer.categoryHistogram !== undefined ) {
    clean.categoryHistogram = [].concat( dirty.categoryHistogramContainer.categoryHistogram ).map( category => {
      let children = [].concat( category.childCategoryHistogram ).map( child => {
        return {
          category: {
            name: child.categoryName,
            id: child.categoryId,
          },
          count: +child.count,
        };
      } );
      return {
        category: {
          name: category.categoryName,
          id: category.categoryId,
        },
        count: +category.count,
        childCategoryHistogram: children,
      }
    } );
  }

  return clean;
}

function buildSearchUrl( req ): Promise<string> {
  let defaultZip = '98177';

  return new Promise( ( resolve, reject ) => {
    let searchUrl = 'https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=XML&REST-PAYLOAD=true'
    searchUrl += '&SECURITY-APPNAME=' + appId;
    searchUrl += '&paginationInput.entriesPerPage=20';
    searchUrl += '&outputSelector(0)=PictureURLLarge';
    searchUrl += '&outputSelector(1)=AspectHistogram';
    searchUrl += '&outputSelector(2)=CategoryHistogram';

    let filterIndex = 0;
    let selectorIndex = 3;
    try {
      // ====================================================================================
      // Query
      // ====================================================================================
      if ( req.query.hasOwnProperty( 'query' ) ) {
        searchUrl += '&keywords=' + req.query.query;
      } else {
        throw new HttpError( 'Keyword is required', 400 );
      }

      // ====================================================================================
      // Pagination
      // ====================================================================================
      if ( req.query.hasOwnProperty( 'page' ) ) {
        if ( Number.isInteger( +req.query.page ) && +req.query.page > 1 ) {
          searchUrl += '&paginationInput.pageNumber=' + req.query.page;
        } else {
          throw new HttpError( 'Invalid page', 400 );
        }
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

      if ( req.query.hasOwnProperty( 'sortBy' ) ) {
        if ( validSortings.has( +req.query.sortBy ) ) {
          searchUrl += '&sortOrder=' + validSortings.get( +req.query.sortBy );
        } else {
          throw new HttpError( 'Invalid sorting', 400 );
        }
      }

      // ====================================================================================
      // Category
      // ====================================================================================
      if ( req.query.hasOwnProperty( 'category' ) ) {
        searchUrl += '&categoryId=' + req.query.category;
      }

      // ====================================================================================
      // Filtering -- Listing Type
      // ====================================================================================
      if ( req.query.hasOwnProperty( 'listType' ) ) {
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
        } else {
          throw new HttpError( 'Invalid list type', 400 );
        }
      }

      // ====================================================================================
      // Filtering -- Condition
      // ====================================================================================
      if ( req.query.hasOwnProperty( 'condition' ) ) {
        searchUrl += `&itemFilter(${filterIndex}).name=Condition`
        searchUrl += `&itemFilter(${filterIndex}).value(0)=${req.query.condition}`
      }

      request( `https://api.ipgeolocation.io/timezone?apiKey=${ipApiKey}&ip=${req.ip}` ).then( response => {
        searchUrl += `&buyerPostalCode=${response.geo.zipcode}`;
      } ).catch( error => {
        searchUrl += `&buyerPostalCode=${defaultZip}`;
      } ).finally( () => {
        resolve( searchUrl );
      } )
    } catch ( error ) {
      reject( error );
    }
  } );
}

export { search };