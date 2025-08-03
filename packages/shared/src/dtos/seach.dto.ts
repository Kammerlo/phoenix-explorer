
export enum SearchType {
  EPOCH,
  BLOCK,
  TRANSACTION,
  ASSET
}

export interface searchDto {
  found : boolean;
  type: SearchType[]
}
