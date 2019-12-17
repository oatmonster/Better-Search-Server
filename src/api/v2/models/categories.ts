import request from 'request-promise-native';
import xml2js from 'xml2js';
import { ICategory, ICondition } from '../common/interfaces';
import { HttpError, countUtf8Bytes } from '../common/utils';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const appId = process.env.APP_ID;
const authNAuth = process.env.AUTH_N_AUTH;

let version = -1;
let categoryMap = new Map<string, ICategory>();
let categoryTree = new Map<string, ICategory[]>();

function init() {
  return new Promise( ( resolve, reject ) => {
    console.log( 'INIT retreiving category info' );
    console.time( 'INIT retreiving category info' );
    update().then( () => {
      resolve();
    } ).catch( error => {
      reject( error );
    } ).finally( () => {
      console.timeEnd( 'INIT retreiving category info' );
    } );
  } );
}

function getAll(): Promise<any> {
  return new Promise( ( resolve, reject ) => {
    update().then( () => {
      resolve( Array.from( categoryMap.values() ) );
    } ).catch( error => {
      reject( error );
    } );
  } );
}

function getChildren( id: string ): Promise<any> {
  return new Promise( ( resolve, reject ) => {
    update().then( () => {
      resolve( categoryTree.get( id ) );
    } ).catch( error => {
      reject( error );
    } );
  } );
}

function getCategory( id: string ): Promise<ICategory> {
  return new Promise( ( resolve, reject ) => {
    update().then( () => {
      resolve( categoryMap.get( id ) );
    } ).catch( error => {
      reject( error );
    } );
  } );
}

function update(): Promise<any> {
  return new Promise( ( resolve, reject ) => {
    let body = `
      <?xml version="1.0" encoding="utf-8"?>
      <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
          <eBayAuthToken>${authNAuth}</eBayAuthToken>
        </RequesterCredentials>
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <CategorySiteID>0</CategorySiteID>
      </GetCategoriesRequest>
    `;
    let options = {
      method: 'POST',
      url: 'https://api.ebay.com/ws/api.dll',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': countUtf8Bytes( body ),
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetCategories',
      },
      body: body,
    };
    request( options ).then( response => {
      return parser( response );
    } ).then( result => {
      if ( version < +result.GetCategoriesResponse.CategoryVersion ) {
        let body = `
          <?xml version="1.0" encoding="utf-8"?>
          <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
              <eBayAuthToken>${authNAuth}</eBayAuthToken>
            </RequesterCredentials>
            <ErrorLanguage>en_US</ErrorLanguage>
            <WarningLevel>High</WarningLevel>
            <CategorySiteID>0</CategorySiteID>
            <DetailLevel>ReturnAll</DetailLevel>
          </GetCategoriesRequest>
        `;
        let options = {
          method: 'POST',
          url: 'https://api.ebay.com/ws/api.dll',
          headers: {
            'Content-Type': 'text/xml',
            'Content-Length': countUtf8Bytes( body ),
            'X-EBAY-API-SITEID': '0',
            'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
            'X-EBAY-API-CALL-NAME': 'GetCategories',
          },
          body: body,
        };
        request( options ).then( response => {
          return parser( response );
        } ).then( result => {
          version = +result.GetCategoriesResponse.CategoryVersion;
          if ( result.GetCategoriesResponse.Ack !== 'Success' ) {
            // TODO: Check ebay error message to find cause of failure 
            throw new HttpError( 'Failed to get category info', 400 );
          }
          categoryTree.clear();
          categoryMap.clear();
          result.GetCategoriesResponse.CategoryArray.Category.forEach( category => {
            let cleanCategory: ICategory = {
              id: category.CategoryID,
              name: category.CategoryName,
              parentId: category.CategoryParentID,
            };
            if ( cleanCategory.id === cleanCategory.parentId ) {
              cleanCategory.parentId = '0';
            }

            // Build category tree
            if ( categoryTree.has( cleanCategory.parentId ) ) {
              categoryTree.get( cleanCategory.parentId ).push( cleanCategory );
            } else {
              categoryTree.set( cleanCategory.parentId, [ cleanCategory ] );
            }

            //Build category map
            categoryMap.set( cleanCategory.id, cleanCategory );
          } );

          resolve();
        } ).catch( error => {
          reject( error );
        } );
      } else {
        resolve();
      }
    } ).catch( error => {
      reject( error );
    } );
  } );
}

export { getAll, getChildren, getCategory, init };