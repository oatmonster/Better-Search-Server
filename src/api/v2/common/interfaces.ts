export interface ICategory {
  id: string,
  name: string,
  parentId?: string,
}

export interface ICondition {
  id: string,
  name: string,
}

export interface IItem {
  itemId: string,
  title: string,
  thumbnailUrl: string,
  galleryUrls?: string[],
  country: string,
  condition?: ICondition,
  category?: ICategory,
  listingInfo: {
    startTimeUtc: string,
    endTimeUtc: string,
    timeRemaining: string,
  },
  listingType: 'Advertisement' | 'Auction' | 'AuctionWithBIN' | 'FixedPrice' | 'OtherType',
  bestOfferEnabled: boolean,
  buyItNowEnabled: boolean,
  currentPrice: {
    price: number,
    currencyId: string,
  },
  currentPriceConverted: {
    price: number,
    currencyId: string,
  },
  sellingState: string,
  watchCount?: number,
  bidCount?: number,
  shippingInfo: {
    type: string,
    cost: number,
    currencyId: string,
  },
  description?: string,
  itemEbayUrl?: string,
}

export interface ISearchResult {
  searchResult: {
    count: number,
    items: IItem[],
  },
  pagination: {
    page: number,
    totalPages: number,
    totalEntries: number,
    entriesPerPage: number,
  },
  searchEbayUrl: string,
  aspectHistogram: {
    aspect: string,
    values: {
      name: string,
      count: number,
    }[],
  }[],
  categoryHistogram: {
    category: ICategory,
    count: number,
    childCategoryHistogram: {
      category: ICategory,
      count: number,
    }[],
  }[],
}