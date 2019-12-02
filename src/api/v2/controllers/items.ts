import request from 'request-promise-native';
import xml2js from 'xml2js';
import moment from 'moment-timezone';
import { IItem } from '../common/interfaces';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseString;
const appId = process.env.APP_ID;
const authNAuth = process.env.AUTH_N_AUTH;
const ipApiKey = process.env.IP_API_KEY;

const getItem = ( req, res ) => {
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
    };
    let zipCode = '';
    let timeZone = '';
    let shippingInfo = {
      type: undefined,
      cost: undefined,
      currencyId: undefined,
    };

    request( `https://api.ipgeolocation.io/timezone?apiKey=${ipApiKey}&ip=${req.ip}` ).then( response => {
      zipCode = response.geo.zipcode;
      timeZone = response.timezone;
    } ).catch( error => {
      zipCode = '98177';
      timeZone = 'America/Los_Angeles'
    } ).then( () => {
      // Get shipping cost
      shippingInfo.type = 'test';
      shippingInfo.cost = 42;
      shippingInfo.currencyId = 'USD'
    } ).then( () => {
      return request( options )
    } ).then( response => {
      parser( response, ( err, result ) => {
        delete result.GetItemResponse[ '$' ];
        result = result.GetItemResponse.Item;

        let cleanItem: IItem = {
          itemId: result.ItemID,
          title: result.Title,
          thumbnailUrl: result.PictureDetails.GalleryURL,
          galleryUrls: result.PictureDetails.PictureURL,
          country: result.Country,
          category: {
            categoryId: result.PrimaryCategory.CategoryID,
            categoryName: result.PrimaryCategory.CategoryName.split( ':' ).slice( -1 )[ 0 ],
          },
          listingInfo: {
            startTimeUtc: result.ListingDetails.StartTime,
            endTimeUtc: result.ListingDetails.EndTime,
            endTimeLocal: undefined,
            timeRemaining: result.TimeLeft,
            timeTilEndDay: undefined,
          },
          listingType: undefined,
          bestOfferEnabled: result.BestOfferDetails && result.BestOfferDetails.BestOfferEnabled && result.BestOfferDetails.BestOfferEnabled === 'true',
          buyItNowEnabled: result.ListingType === 'Chinese' && result.ListingDetails.BuyItNowAvailable && result.ListingDetails.BuyItNowAvailable === 'true',
          currentPrice: {
            price: +result.SellingStatus.CurrentPrice[ '_' ],
            currencyId: result.SellingStatus.CurrentPrice[ '$' ],
          },
          currentPriceConverted: {
            price: +result.SellingStatus.ConvertedCurrentPrice[ '_' ],
            currencyId: result.SellingStatus.ConvertedCurrentPrice[ '$' ],
          },
          sellingState: result.SellingStatus.ListingState,
          shippingInfo: undefined,
        };

        cleanItem.shippingInfo = shippingInfo;

        cleanItem.condition = undefined;

        if ( result.ListingType === 'Chinese' ) {
          if ( cleanItem.buyItNowEnabled ) {
            cleanItem.listingType = 'AuctionWithBIN';
          } else {
            cleanItem.listingType = 'Auction';
          }
        } else if ( result.ListingType === 'AdType' || result.ListingType === 'LeadGeneration' ) {
          cleanItem.listingType = 'Advertisement';
        } else if ( result.ListingType === 'FixedPriceItem' ) {
          cleanItem.listingType = 'FixedPrice';
        } else {
          cleanItem.listingType = 'OtherType';
        }

        if ( cleanItem.listingType === 'Auction' || cleanItem.listingType === 'AuctionWithBIN' ) {
          cleanItem.bidCount = +result.SellingStatus.BidCount;
        }

        cleanItem.listingInfo.endTimeLocal = moment( cleanItem.listingInfo.endTimeUtc ).tz( timeZone ).toString();

        let timeTilEndDay = moment.duration( moment( cleanItem.listingInfo.endTimeUtc ).tz( timeZone ).startOf( 'day' ).diff( moment().tz( timeZone ) ) );

        if ( timeTilEndDay.asMilliseconds() < 1 ) {
          cleanItem.listingInfo.timeTilEndDay = 'PT0S';
        } else {
          cleanItem.listingInfo.timeTilEndDay = timeTilEndDay.toISOString();
        }

        res.status( 200 ).json( cleanItem );
      } );
    } );
  } catch ( error ) {
    console.error( error );
    res.sendStatus( 500 );
  }
}

const getItemPictures = ( req, res ) => {
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

const getItemDescription = ( req, res ) => {
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

export { getItem, getItemPictures, getItemDescription };