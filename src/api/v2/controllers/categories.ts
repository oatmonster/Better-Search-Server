import request from 'request-promise-native';
import xml2js from 'xml2js';
import { ICategory, ICondition } from '../common/interfaces';
import { HttpError, countUtf8Bytes } from '../common/utils';
import * as model from '../models/categories';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const appId = process.env.APP_ID;
const authNAuth = process.env.AUTH_N_AUTH;

function getAll( req, res ) {
  console.log( 'REQUEST Get all categories' );
  console.time( 'REQUEST Get all categories' );
  model.getAll().then( categories => {
    res.status( 200 ).json( categories );
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } ).finally( () => {
    console.timeEnd( 'REQUEST Get all categories' );
  } );
}

function getChildCategories( req, res ) {
  console.log( 'REQUEST Get children of category ' + req.params.categoryId );
  console.time( 'REQUEST Get children of category ' + req.params.categoryId );

  model.getChildren( req.params.categoryId ).then( children => {
    res.status( 200 ).json( children );
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } ).finally( () => {
    console.timeEnd( 'REQUEST Get children of category ' + req.params.categoryId );
  } );
}

function getCategory( req, res ) {
  console.log( 'REQUEST Get category ' + req.params.categoryId );
  console.time( 'REQUEST Get category ' + req.params.categoryId );
  model.getCategory( req.params.categoryId ).then( category => {
    if ( category === undefined ) {
      // Category does not exist
      throw new HttpError( 'Category does not exist', 404 );
    }
    res.status( 200 ).json( category );
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } ).finally( () => {
    console.timeEnd( 'REQUEST Get category ' + req.params.categoryId );
  } );
}

function getCategoryConditions( req, res ) {
  console.log( 'REQUEST Get conditions of category ' + req.params.categoryId );
  console.time( 'REQUEST Get conditions of category ' + req.params.categoryId );
  let body = `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoryFeaturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${authNAuth}</eBayAuthToken>
      </RequesterCredentials>
      <DetailLevel>ReturnAll</DetailLevel>
      <LevelLimit>1</LevelLimit>
      <ViewAllNodes>true</ViewAllNodes>
      <CategoryID>${req.params.categoryId}</CategoryID>
      <FeatureID>ConditionValues</FeatureID>
    </GetCategoryFeaturesRequest>
  `;
  let options = {
    method: 'POST',
    url: 'https://api.ebay.com/ws/api.dll',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': countUtf8Bytes( body ),
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetCategoryFeatures',
    },
    body: body,
  };
  model.getCategory( req.params.categoryId ).then( category => {
    if ( category === undefined ) {
      // Category does not exist
      throw new HttpError( 'Category does not exist', 404 );
    }
    return request( options );
  } ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetCategoryFeaturesResponse.Ack !== 'Success' ) {
      // TODO: Check ebay error message to find cause of failure 
      throw new HttpError( 'Failed to get condition info', 400 );
    }
    if ( result.GetCategoryFeaturesResponse.hasOwnProperty( 'Category' ) ) {
      let conditions = [].concat( result.GetCategoryFeaturesResponse.Category.ConditionValues.Condition || [] );
      let cleanConditions: ICondition[] = conditions.map( condition => {
        let cleanCondition: ICondition = {
          id: condition.ID,
          name: condition.DisplayName,
        }
        return cleanCondition
      } );
      res.status( 200 ).json( cleanConditions );
    } else {
      res.status( 200 ).json( [] );
    }
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } ).finally( () => {
    console.timeEnd( 'REQUEST Get conditions of category ' + req.params.categoryId );
  } );
}

export { getAll, getChildCategories, getCategory, getCategoryConditions };